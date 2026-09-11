import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, PageLayoutType } from '@grafana/data';
import { getBackendSrv, PluginPage } from '@grafana/runtime';
import { Button, Combobox, ComboboxOption, Field, Input, useStyles2 } from '@grafana/ui';
import { AppPageHeader } from '../components/AppPageHeader';
import { BackToMainLink } from '../components/BackToMainLink';

const CHAT_RESOURCE_URL = '/api/plugins/main-noc-app/resources/chat';

type ChatSession = {
  id: number;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
};

type ChatMessage = {
  id: number;
  sessionId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type BedrockModel = {
  modelId: string;
  name: string;
  provider: string;
};

function Chat() {
  const styles = useStyles2(getStyles);
  const [models, setModels] = useState<BedrockModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [modelsStatus, setModelsStatus] = useState('Loading models...');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('');
  const [isBedrockUnavailable, setIsBedrockUnavailable] = useState(false);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;

  const refreshSessions = useCallback(async () => {
    try {
      const result = await getBackendSrv().get<ChatSession[]>(`${CHAT_RESOURCE_URL}/sessions`);
      setSessions(Array.isArray(result) ? result : []);
    } catch {
      setStatus('Unable to load chat sessions');
    }
  }, []);

  useEffect(() => {
    getBackendSrv()
      .get<{ models: BedrockModel[]; defaultModelId: string }>(`${CHAT_RESOURCE_URL}/models`)
      .then((result) => {
        const fetchedModels = Array.isArray(result?.models) ? result.models : [];
        setModels(fetchedModels);
        const defaultAvailable = fetchedModels.some((model) => model.modelId === result?.defaultModelId);
        setSelectedModelId(defaultAvailable ? result.defaultModelId : fetchedModels[0]?.modelId ?? '');
        setModelsStatus(fetchedModels.length === 0 ? 'No Bedrock models available' : '');
        setIsBedrockUnavailable(fetchedModels.length === 0);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Unable to load Bedrock models';
        setModelsStatus(message);
        setIsBedrockUnavailable(true);
      });
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    let isCurrent = true;
    getBackendSrv()
      .get<ChatMessage[]>(`${CHAT_RESOURCE_URL}/sessions/${activeSessionId}/messages`)
      .then((result) => {
        if (isCurrent) {
          setMessages(Array.isArray(result) ? result : []);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setStatus('Unable to load messages');
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [activeSessionId]);

  const createSession = async () => {
    if (!selectedModelId) {
      setStatus('Choose a model first');
      return;
    }
    try {
      const session = await getBackendSrv().post<ChatSession>(`${CHAT_RESOURCE_URL}/sessions`, {
        title: 'New chat',
        modelId: selectedModelId,
      });
      setSessions((previous) => [session, ...previous]);
      setActiveSessionId(session.id);
      setStatus('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create chat session';
      setStatus(message);
    }
  };

  const deleteSession = async (sessionId: number) => {
    try {
      await getBackendSrv().delete(`${CHAT_RESOURCE_URL}/sessions/${sessionId}`);
      setSessions((previous) => previous.filter((session) => session.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch {
      setStatus('Unable to delete chat session');
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !activeSession || isSending) {
      return;
    }

    setIsSending(true);
    setStatus('');
    try {
      const result = await getBackendSrv().post<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        `${CHAT_RESOURCE_URL}/sessions/${activeSession.id}/messages`,
        { content }
      );
      setMessages((previous) => [...previous, result.userMessage, result.assistantMessage]);
      setDraft('');
      void refreshSessions();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to get a response';
      setStatus(message);
    } finally {
      setIsSending(false);
    }
  };

  const modelOptions: Array<ComboboxOption<string>> = models.map((model) => ({
    label: `${model.provider} — ${model.name}`,
    value: model.modelId,
  }));

  return (
    <PluginPage layout={PageLayoutType.Canvas}>
      <AppPageHeader>
        <BackToMainLink />
      </AppPageHeader>
      <div className={styles.page}>
        <aside
          className={`${styles.sidebar} ${isBedrockUnavailable ? styles.disabledSection : ''}`}
          aria-label="Chat sessions"
          aria-disabled={isBedrockUnavailable}
        >
          <Field label="Model" className={styles.modelField}>
            <Combobox
              aria-label="Bedrock model"
              options={modelOptions}
              value={selectedModelId}
              placeholder={modelsStatus || 'Choose a model'}
              disabled={isBedrockUnavailable}
              onChange={(option) => setSelectedModelId(option?.value ?? '')}
            />
          </Field>
          <Button
            title="New chat"
            data-testid="new-chat-session"
            disabled={isBedrockUnavailable}
            onClick={() => void createSession()}
          >
            New chat
          </Button>
          <ul className={styles.sessionList} data-testid="chat-session-list">
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  className={`${styles.sessionButton} ${session.id === activeSessionId ? styles.sessionButtonActive : ''}`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  {session.title}
                </button>
                <button
                  type="button"
                  title="Delete chat"
                  aria-label={`Delete ${session.title}`}
                  className={styles.deleteSessionButton}
                  onClick={() => void deleteSession(session.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <main className={styles.thread}>
          {activeSession ? (
            <>
              <div className={styles.messages} data-testid="chat-messages">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.message} ${message.role === 'user' ? styles.messageUser : styles.messageAssistant}`}
                  >
                    <span className={styles.messageRole}>{message.role === 'user' ? 'You' : 'Assistant'}</span>
                    <p>{message.content}</p>
                  </div>
                ))}
              </div>
              <form className={styles.composer} onSubmit={sendMessage}>
                <Input
                  aria-label="Message"
                  className={styles.composerInput}
                  value={draft}
                  placeholder="Ask something..."
                  onChange={(event) => setDraft(event.currentTarget.value)}
                  disabled={isSending || isBedrockUnavailable}
                />
                <Button type="submit" data-testid="send-chat-message" disabled={isSending || isBedrockUnavailable || !draft.trim()}>
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </form>
            </>
          ) : (
            <p className={styles.emptyState}>Start a new chat or pick one from the list.</p>
          )}
          {isBedrockUnavailable && (
            <span role="status" className={styles.status} data-testid="bedrock-unavailable">
              Bedrock is unavailable: {modelsStatus}
            </span>
          )}
          {status && (
            <span role="status" className={styles.status}>
              {status}
            </span>
          )}
        </main>
      </div>
    </PluginPage>
  );
}

export default Chat;

const getStyles = (theme: GrafanaTheme2) => ({
  page: css`
    display: flex;
    gap: ${theme.spacing(3)};
    width: 100%;
    min-height: 70vh;
    padding-top: ${theme.spacing(4)};

    @media (max-width: 720px) {
      flex-direction: column;
    }
  `,
  sidebar: css`
    box-sizing: border-box;
    width: 280px;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(2)};

    @media (max-width: 720px) {
      width: 100%;
    }
  `,
  disabledSection: css`
    opacity: 0.5;
    pointer-events: none;
    filter: grayscale(1);
  `,
  modelField: css`
    margin-bottom: 0;
  `,
  sessionList: css`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1)};
    overflow-y: auto;

    li {
      display: flex;
      align-items: center;
      gap: ${theme.spacing(1)};
    }
  `,
  sessionButton: css`
    flex: 1;
    min-width: 0;
    text-align: start;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: ${theme.spacing(1)} ${theme.spacing(1.5)};
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.secondary};
    color: ${theme.colors.text.primary};
    border-radius: ${theme.shape.radius.default};
    cursor: pointer;
  `,
  sessionButtonActive: css`
    border-color: ${theme.colors.primary.border};
    background: ${theme.colors.action.selected};
  `,
  deleteSessionButton: css`
    flex: 0 0 auto;
    border: none;
    background: transparent;
    color: ${theme.colors.text.secondary};
    cursor: pointer;

    &:hover {
      color: ${theme.colors.error.text};
    }
  `,
  thread: css`
    box-sizing: border-box;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.primary};
    padding: ${theme.spacing(3)};
    gap: ${theme.spacing(2)};
  `,
  messages: css`
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(2)};
  `,
  message: css`
    max-width: 80%;
    padding: ${theme.spacing(1.5)} ${theme.spacing(2)};
    border-radius: ${theme.shape.radius.default};

    p {
      margin: ${theme.spacing(0.5)} 0 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
  messageUser: css`
    align-self: flex-end;
    background: ${theme.colors.primary.transparent};
  `,
  messageAssistant: css`
    align-self: flex-start;
    background: ${theme.colors.background.secondary};
  `,
  messageRole: css`
    font-size: 12px;
    font-weight: 600;
    color: ${theme.colors.text.secondary};
  `,
  composer: css`
    display: flex;
    gap: ${theme.spacing(1)};
  `,
  composerInput: css`
    flex: 1;
  `,
  emptyState: css`
    margin: auto;
    color: ${theme.colors.text.secondary};
  `,
  status: css`
    color: ${theme.colors.error.text};
  `,
});
