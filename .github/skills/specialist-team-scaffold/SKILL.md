---
name: specialist-team-scaffold
description: 'Create a focused specialist agent, independent reviewer agent, and optional team lead for a repeated engineering domain. Use when adding a new backend, frontend, testing, security, or operations agent team.'
argument-hint: 'Name the domain and responsibilities for the new agent team'
user-invocable: true
---
# Specialist Team Scaffold

Use this workflow when a recurring engineering domain needs an implementation agent, a review agent, and a lead.

## Procedure
1. Identify the repeatable domain, its workspace files, validation commands, and failure modes.
2. Create an implementation agent in `.github/agents/` with only the tools it needs.
3. Create an independent reviewer agent with read/search/execute tools only and a findings-first output format.
4. Create a team lead when the domain benefits from delegation. Give it `agent` access and restrict `agents` to the specialist/reviewer pair.
5. Make each description keyword-rich so it can be discovered automatically and in the agent picker.
6. Verify YAML frontmatter: name, description, tools, `user-invocable`, and lead delegation list.

## Design Rules
- Keep each agent to one clear role.
- Reviewers must not edit product code.
- Leads coordinate evidence and validation; they do not claim tests pass without completed output.
- Encode repository conventions and constraints, not generic programming advice.
