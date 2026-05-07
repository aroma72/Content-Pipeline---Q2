# Session Summary — MCP Servers
**Course**: Agentic AI | **Week**: 19 | **Date**: 2026-05-04
**Duration**: 90 minutes | **Format**: Lecture + Live Build + Hands-on Lab

---

## Learning Outcomes

By the end of this session, you will be able to:

1. **Explain what MCP is** — understand the protocol, why it exists, and how it differs from regular function calling
2. **Design an MCP server architecture** — know the roles of host, client, and server; understand stdio vs SSE transport
3. **Build a working MCP server** — write a Python MCP server that exposes tools to Claude
4. **Connect Claude to an MCP server** — use the MCP SDK to let Claude autonomously call tools from a separate server
5. **Apply MCP to real workflows** — see how MCP powers autonomous agents like Drawing Room's orchestrator

---

## Key Concepts

### What is MCP?
**Model Context Protocol** — a standard for connecting external tools to Claude and other AI models. Think of it like USB for AI: you build a "tool server" once, plug it into any agent using a standard protocol.

### The Problem MCP Solves
Without MCP: Every agent hardcodes its own tool definitions. Duplicated code, hard to update, tied to one agent.  
With MCP: Build a tool server once. Any agent can connect and use it. Update the server → all agents benefit.

### MCP Architecture
- **Host**: Your application (e.g., Claude Desktop, your agent)
- **MCP Client**: Lives in the host; talks to MCP servers via stdio or SSE
- **MCP Server**: Separate process exposing a list of tools
- **Transport**: How client and server communicate (stdio = local process, SSE = remote HTTP)

### Key Difference from Regular Tool Use
| Aspect | Regular Tool Use | MCP |
|--------|-----------------|-----|
| Where is the tool? | In your agent code | On a separate server |
| Can you reuse it? | Only by copying code | Yes, any agent can use it |
| Who updates it? | You do, when you change your agent | A separate team, independently |
| Does Claude see it? | Yes, you pass it in the API call | Yes, your agent fetches it from the server |

---

## Common Misconceptions

### Misconception 1: MCP is the same as tool use
**Clarification**: MCP is a *way to organize* tool use, not a replacement for it. Claude still calls tools the same way. The difference is where the tools live — in your code or on a separate server.

### Misconception 2: I need MCP for every tool
**Clarification**: No. MCP shines when tools are shared, maintained separately, or need to live remotely. For a single-agent prototype, regular Python functions are simpler.

### Misconception 3: MCP is only for Python
**Clarification**: Anthropic ships official SDKs for Python and TypeScript. You can write MCP servers in any language; Claude connects via the protocol.

### Misconception 4: The client talks to Claude
**Clarification**: The opposite. The MCP *client* (in your agent) talks to the MCP *server* (your tools). Claude talks to the client and tells it which tools to use.

### Misconception 5: MCP servers are permanent/always running
**Clarification**: Not necessarily. You can spin up a server per session, or run it long-lived. stdio servers are often spawned on-demand; SSE servers tend to be persistent.

---

## Next Steps (Recommended Watch Order)

1. **Essential Edit** (watch this; ~45 min)
   - Full session recording, core concepts only
   - Explains MCP problem → architecture → benefits
   - You'll understand the "why" before diving into code

2. **Concept Clip: Protocol Basics** (2 min)
   - High-level overview of client/server roles
   - Watch if architecture section was confusing

3. **Concept Clip: Stdio vs SSE** (2 min)
   - Quick explanation of the two transport modes
   - Watch if you're building a production system

4. **Concept Clip: Building a Server** (3 min)
   - Walkthrough of the simplest MCP server
   - Watch if you want a pre-build refresh

5. **Concept Clip: Connecting Claude** (4 min)
   - How to wire up a client and let Claude use the tools
   - Watch this before the hands-on assignment

6. **Assignment: Add a Tool** (15 min, in-session)
   - You'll extend the filesystem server
   - Complete before moving on

---

## Glossary

| Term | Definition | In Context |
|------|-----------|-----------|
| **MCP (Model Context Protocol)** | A standard protocol for connecting external tools to Claude. Like USB, but for AI agents. | "We built a file-reading tool as an MCP server so any agent can use it." |
| **MCP Server** | A separate process that exposes a list of tools via the protocol. The "kitchen" in the restaurant analogy. | "Our MCP server runs on port 8000 and offers read_file, write_file, and search_file tools." |
| **MCP Client** | A library/code that lives in your agent and communicates with an MCP server. The "waiter" bringing orders and results. | "The MCP client uses the SDK to connect to the server and fetch available tools." |
| **Tool** | A function the agent can call (e.g., read a file, search the web, run code). | "The read_file tool takes a filename and returns its contents." |
| **inputSchema** | A JSON Schema object that describes what parameters a tool accepts. Tells Claude how to call it correctly. | "The inputSchema for write_file says it needs 'filename' (string) and 'content' (string)." |
| **list_tools()** | MCP server method that returns the list of available tools. Claude asks for this to know what it can do. | "When Claude connects, it calls list_tools() and sees three tools: read, write, search." |
| **call_tool()** | MCP server method that executes a tool when Claude calls it. The actual work happens here. | "Claude decides to use read_file. The client calls call_tool('read_file', {filename: 'notes.txt'}). The server returns the file content." |
| **stdio** | Standard input/output transport. The MCP server is a local process; client talks to it via stdin/stdout. Simple, local. | "We spawned the MCP server as a subprocess and talk to it through stdio pipes." |
| **SSE (Server-Sent Events)** | HTTP transport. The MCP server runs remotely; client connects via HTTP. Good for cloud deployments. | "The MCP server runs in the cloud, and the client connects to it via HTTPS and SSE." |
| **Host** | Your application (agent, chatbot, etc.) that contains the MCP client. Like a restaurant's front-of-house. | "The Drawing Room orchestrator is the host; it holds an MCP client that connects to our file server." |
| **Protocol** | A standard way for systems to communicate. MCP defines the messages, roles, and rules for agent-tool interaction. | "The MCP protocol says servers must respond to list_tools() and call_tool() requests in JSON format." |
| **Autonomous agent** | Software that perceives, reasons, and acts without human intervention in the loop. MCP is what gives agents the ability to *act* on the world. | "Without MCP, Claude can't change anything — it can only talk. MCP lets it read files, write outputs, call APIs." |

---

## Session Checklist

**Before the session:**
- [ ] Watch the Essential Edit (45 min)
- [ ] Skim the Glossary above so terms don't surprise you

**During the session:**
- [ ] Follow the live build (don't code ahead; ask if stuck)
- [ ] Ask the instructor clarifying questions as they come up
- [ ] Complete the hands-on task (add a new tool to the server)

**After the session:**
- [ ] Re-watch the Concept Clips (8 min total) to cement details
- [ ] Try the assignment at home if you didn't finish in session
- [ ] Think: "What MCP server would I build for a real project?"

---

## Assignment

**Goal**: Add a `search_files(keyword)` tool to the filesystem server.

**What it should do**:
- Accept one argument: `keyword` (string, required)
- Search all files in the workspace directory
- Return the names of files that contain the keyword (one per line)
- Return "No matches found" if none match

**Example**:
```
User: Search for files mentioning "gradient"
Claude uses: search_files(keyword="gradient")
Server returns: "notes.txt\ntutorial.md"
```

**Stretch goal** (if you finish early):
- Add a `summarise_file(filename)` tool
- Takes a filename; reads the file; calls Claude to write a 1-paragraph summary
- Returns the summary to the agent

**Submission**:
- Push your updated server code to the repo (or share in a gist/email)
- Include a test: one sentence showing Claude successfully used your new tool

**Debrief questions** (think about these):
1. How much of your agent code changed when you added the new tool?
2. What would happen if another agent connected to this server at the same time?
3. What's one real MCP server you'd want to build for Drawing Room's orchestrator?

---

## FAQ

**Q: Do I need to understand every detail of the MCP spec to use it?**  
A: No. You need to know: (1) tools are on a server, (2) Claude can call them, (3) you define the list + the execution. That's enough.

**Q: Can I run multiple MCP servers at once?**  
A: Yes. Your host can connect to many servers. Claude sees all their tools in one merged list.

**Q: What if my MCP server crashes?**  
A: Claude gets an error when it tries to use a tool from that server. It can acknowledge the error and move on, or ask the user for help. Your agent code doesn't break.

**Q: Is MCP production-ready?**  
A: Yes. It's used in Claude Desktop, Anthropic's official examples, and deployed agents.

---

## Key Takeaway

MCP is how you give your agent **hands**. Without it, Claude can reason brilliantly but can't actually *do* anything in the world — no files, no APIs, no changes. MCP is the bridge between thinking and acting. For Drawing Room, it's how the orchestrator will read signals, write content plans, and publish assets to the platform.

**In one sentence**: MCP = tools that live on a server, reusable across any agent, updated independently.

---

**Ready to watch the session?** Start with the Essential Edit. Ask questions in the chat. Complete the assignment. You've got this!
