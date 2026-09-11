package plugin

import (
	"context"
	"fmt"
	"sort"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrock"
	bedrocktypes "github.com/aws/aws-sdk-go-v2/service/bedrock/types"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	runtimetypes "github.com/aws/aws-sdk-go-v2/service/bedrockruntime/types"
)

// BedrockModel is the subset of a Bedrock foundation model summary the frontend needs.
type BedrockModel struct {
	ModelID  string `json:"modelId"`
	Name     string `json:"name"`
	Provider string `json:"provider"`
}

// listBedrockModels returns on-demand, text-output foundation models, sorted by provider then name.
func listBedrockModels(ctx context.Context, client *bedrock.Client) ([]BedrockModel, error) {
	output, err := client.ListFoundationModels(ctx, &bedrock.ListFoundationModelsInput{
		ByInferenceType:  bedrocktypes.InferenceTypeOnDemand,
		ByOutputModality: bedrocktypes.ModelModalityText,
	})
	if err != nil {
		return nil, fmt.Errorf("list foundation models: %w", err)
	}

	models := make([]BedrockModel, 0, len(output.ModelSummaries))
	for _, summary := range output.ModelSummaries {
		if summary.ModelId == nil {
			continue
		}
		models = append(models, BedrockModel{
			ModelID:  aws.ToString(summary.ModelId),
			Name:     aws.ToString(summary.ModelName),
			Provider: aws.ToString(summary.ProviderName),
		})
	}
	sort.Slice(models, func(i, j int) bool {
		if models[i].Provider != models[j].Provider {
			return models[i].Provider < models[j].Provider
		}
		return models[i].Name < models[j].Name
	})
	return models, nil
}

// converseWithBedrock sends the conversation history plus the new user message to modelID via the
// Converse API (a single request/response shape shared across model providers) and returns the
// assistant's reply text.
func converseWithBedrock(ctx context.Context, client *bedrockruntime.Client, modelID string, history []ChatMessage, userMessage string) (string, error) {
	messages := make([]runtimetypes.Message, 0, len(history)+1)
	for _, message := range history {
		role := runtimetypes.ConversationRoleUser
		if message.Role == "assistant" {
			role = runtimetypes.ConversationRoleAssistant
		}
		messages = append(messages, runtimetypes.Message{
			Role:    role,
			Content: []runtimetypes.ContentBlock{&runtimetypes.ContentBlockMemberText{Value: message.Content}},
		})
	}
	messages = append(messages, runtimetypes.Message{
		Role:    runtimetypes.ConversationRoleUser,
		Content: []runtimetypes.ContentBlock{&runtimetypes.ContentBlockMemberText{Value: userMessage}},
	})

	result, err := client.Converse(ctx, &bedrockruntime.ConverseInput{
		ModelId:  aws.String(modelID),
		Messages: messages,
	})
	if err != nil {
		return "", fmt.Errorf("invoke model: %w", err)
	}

	outputMessage, ok := result.Output.(*runtimetypes.ConverseOutputMemberMessage)
	if !ok {
		return "", fmt.Errorf("unexpected response from model")
	}

	var reply string
	for _, block := range outputMessage.Value.Content {
		if textBlock, ok := block.(*runtimetypes.ContentBlockMemberText); ok {
			reply += textBlock.Value
		}
	}
	if reply == "" {
		return "", fmt.Errorf("model returned an empty response")
	}
	return reply, nil
}
