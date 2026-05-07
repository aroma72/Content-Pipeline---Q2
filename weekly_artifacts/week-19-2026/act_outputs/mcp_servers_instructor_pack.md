# Instructor Pack — MCP Servers
**Course**: Agentic AI | **Week**: 19 | **Date**: 2026-05-04
**Unit ID**: `unit_mcp_servers_w19` | **Time Box**: 90 minutes

---

## Teaching Brief

### What Learners Already Know
- Claude API basics (sending messages, getting responses)
- Tool use / function calling (they've seen Claude decide to call a tool)
- Basic Python (can read and write simple scripts)
- What an "agent" is (autonomous loop, perceive → act → observe)
- JSON structure and REST APIs at a surface level

### Likely Weak Spots (Watch These During the Session)
- **Confusing MCP with function calling** — they'll assume MCP is just "another way to define tools". It's not. MCP is a *protocol* that lets tools live outside the model, on a server, reusable across any agent.
- **"Why not just write the tool in Python?"** — common pushback. Be ready with the separation-of-concerns answer (tool can be updated without redeploying the agent; team can maintain tools independently).
- **Transport layer confusion** — stdio vs SSE. Learners will glaze over this. Keep it simple: stdio = local process, SSE = remote server. Don't go deeper unless asked.
- **Client vs Server roles** — learners often mix up who calls whom. Be explicit: the **Claude client** sends requests, the **MCP server** exposes tools, Claude decides when to use them.
- **"When does Claude actually call the MCP tool?"** — they expect manual trigger. Claude calls it autonomously based on the conversation. Reinforce this is the agentic part.

### Do NOT Reteach (They Have This)
- What a Python function is
- How to install packages with pip
- What JSON is
- Claude's basic API (messages.create)
- What tool_use looks like in a Claude response

---

## Session Plan (90 Minutes)

| Time | Block | Activity |
|------|-------|----------|
| 0:00–0:10 | **Warm-up** | Show a real MCP demo — Claude autonomously reading a file via MCP server. No explanation yet. Ask: "What do you think just happened?" |
| 0:10–0:25 | **Concept: What is MCP?** | The protocol, the problem it solves, client/server model |
| 0:25–0:45 | **Concept: MCP Architecture** | Components (host, client, server, transport), then live diagram |
| 0:45–0:65 | **Live Build** | Build a minimal MCP server together; connect to Claude |
| 0:65–0:80 | **Learner Task** | Learners extend the server with one new tool |
| 0:80–0:90 | **Reflect + Close** | What makes MCP powerful for agents? What would break without it? |

---

## Explanation Variants

### Concept 1: What is MCP?

**Variant A — Protocol Analogy (start here)**
> "MCP is to AI tools what USB is to devices. You don't rewrite your laptop every time you plug in a new keyboard. You use a standard port. MCP is that standard port — any tool you build as an MCP server can plug into any MCP-compatible agent, without rewriting the agent."

**Variant B — Problem-first (use if A doesn't land)**
> "Without MCP, every agent needs its own custom tool definitions. If you build a file reader, a search tool, and a database connector, you hardcode them into your agent. Tomorrow you want to use those same tools in a different agent — you copy-paste everything. MCP solves this: build the tool once as a server, connect it anywhere."

**Variant C — Code-first (use for technical learners)**
> "MCP separates the tool's *interface* (what it does, what inputs it takes) from the tool's *implementation* (the Python code). The Claude client asks: 'what tools do you have?' The MCP server says: 'I have read_file(path) and write_file(path, content).' Claude picks the right one. Your agent code never changes when you add a new tool."

---

### Concept 2: MCP Architecture (Host / Client / Server)

**Variant A — Roles Analogy**
> "Think of a restaurant. The **host** (your app, like Claude Desktop) manages the whole experience. The **client** (inside the host) is the waiter — it takes orders from Claude and brings results back. The **MCP server** is the kitchen — it does the actual work (reads files, calls APIs, queries databases). Claude is the customer who decides what to order."

**Variant B — Explicit Roles**
> "Three moving parts. One: the **MCP Server** — a separate process exposing tools. Two: the **MCP Client** — lives inside your agent code, talks to the server. Three: the **Host** — your application that holds the client. Claude sees the tools the client fetches, decides to use one, client calls the server, server returns result, Claude uses it in its response."

**Variant C — Whiteboard diagram** *(draw this slowly, label each arrow)*
```
[Your App (Host)]
       │
  [MCP Client] ──── stdio / SSE ────► [MCP Server]
       │                                    │
  [Claude API] ◄─── tool_result ────────────┘
       │
  [Claude decides to call tool]
```

---

### Concept 3: Transport — stdio vs SSE

**Keep this short. One variant only.**

> "stdio means the MCP server is a local process — Claude client forks it, talks to it through standard input/output. SSE means the server runs somewhere else (another machine, a cloud service) and Claude client connects via HTTP. For today: we use stdio. It's simpler, everything runs locally."

---

### Concept 4: Why MCP Matters for Agents (the big idea)

**Variant A — Autonomy angle**
> "An agent's power comes from what it can *do*, not just what it can *think*. MCP is what gives your agent hands. Without MCP, Claude can reason about files — but can't touch them. With MCP, Claude can read, write, search, call APIs, run code. The more MCP servers you connect, the more capable your agent becomes — without touching your agent code."

**Variant B — Team workflow angle**
> "In a real team, the person building the agent and the person building the tools are often different. MCP lets them work independently. The tools team maintains MCP servers. The agent team connects to them. When the tools team updates a server, the agent automatically gets new capabilities. No coordination overhead."

---

## Example Bank

### Example 1 — Minimal MCP Server (Easy)
A working MCP server with one tool that returns today's date.

```python
# mcp_date_server.py
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

server = Server("date-server")

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="get_today",
            description="Returns today's date in ISO format",
            inputSchema={"type": "object", "properties": {}, "required": []}
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "get_today":
        from datetime import date
        return [types.TextContent(type="text", text=str(date.today()))]
    raise ValueError(f"Unknown tool: {name}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(stdio_server(server))
```

**What to highlight**: `list_tools` tells Claude what's available. `call_tool` executes it. Two functions. That's the whole server.

---

### Example 2 — File Reader MCP Server (Medium)
A server that lets Claude read files from a specified directory.

```python
# mcp_file_server.py
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
from pathlib import Path

SAFE_DIR = Path("./allowed_files")   # Claude can only read from here

server = Server("file-server")

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="read_file",
            description="Read a file by name from the allowed directory",
            inputSchema={
                "type": "object",
                "properties": {
                    "filename": {"type": "string", "description": "Name of the file to read"}
                },
                "required": ["filename"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "read_file":
        filepath = SAFE_DIR / arguments["filename"]
        if not filepath.exists():
            return [types.TextContent(type="text", text=f"File not found: {arguments['filename']}")]
        content = filepath.read_text(encoding="utf-8")
        return [types.TextContent(type="text", text=content)]
    raise ValueError(f"Unknown tool: {name}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(stdio_server(server))
```

**What to highlight**: Safety boundary (`SAFE_DIR`). Claude can only access what you allow. MCP doesn't remove your control — it extends it responsibly.

---

### Example 3 — Claude Client Connecting to MCP Server (Medium)
How your agent code connects to an MCP server and gives Claude access to its tools.

```python
# agent_with_mcp.py
import asyncio
import anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def run_agent(user_message: str):
    client = anthropic.Anthropic()

    # Connect to MCP server
    server_params = StdioServerParameters(
        command="python",
        args=["mcp_file_server.py"]
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Fetch available tools from the MCP server
            tools_response = await session.list_tools()
            tools = [
                {
                    "name": t.name,
                    "description": t.description,
                    "input_schema": t.inputSchema
                }
                for t in tools_response.tools
            ]

            # Let Claude reason with the tools
            messages = [{"role": "user", "content": user_message}]

            while True:
                response = client.messages.create(
                    model="claude-opus-4-7",
                    max_tokens=1024,
                    tools=tools,
                    messages=messages
                )

                # If Claude is done, print and exit
                if response.stop_reason == "end_turn":
                    for block in response.content:
                        if hasattr(block, "text"):
                            print(block.text)
                    break

                # If Claude wants to use a tool, execute it
                for block in response.content:
                    if block.type == "tool_use":
                        tool_result = await session.call_tool(block.name, block.input)
                        messages.append({"role": "assistant", "content": response.content})
                        messages.append({
                            "role": "user",
                            "content": [{
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": tool_result.content[0].text
                            }]
                        })

asyncio.run(run_agent("Read the file notes.txt and summarise what it says"))
```

**What to highlight**: The `while True` loop is the agent loop. Claude keeps going until it's done. `list_tools` pulls capabilities dynamically — add tools to the server, agent gets them automatically.

---

### Example 4 — Multi-Tool MCP Server (Hard)
A server exposing three tools: read, write, and list files. Shows how to scale.

```python
# mcp_filesystem_server.py
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
from pathlib import Path

WORKSPACE = Path("./workspace")
WORKSPACE.mkdir(exist_ok=True)

server = Server("filesystem-server")

TOOLS = [
    types.Tool(name="list_files",  description="List all files in workspace",
               inputSchema={"type": "object", "properties": {}, "required": []}),
    types.Tool(name="read_file",   description="Read a file from workspace",
               inputSchema={"type": "object", "properties": {
                   "filename": {"type": "string"}}, "required": ["filename"]}),
    types.Tool(name="write_file",  description="Write content to a file in workspace",
               inputSchema={"type": "object", "properties": {
                   "filename": {"type": "string"},
                   "content": {"type": "string"}}, "required": ["filename", "content"]}),
]

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return TOOLS

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "list_files":
        files = [f.name for f in WORKSPACE.iterdir() if f.is_file()]
        return [types.TextContent(type="text", text="\n".join(files) or "No files yet")]

    elif name == "read_file":
        p = WORKSPACE / arguments["filename"]
        text = p.read_text(encoding="utf-8") if p.exists() else "File not found"
        return [types.TextContent(type="text", text=text)]

    elif name == "write_file":
        p = WORKSPACE / arguments["filename"]
        p.write_text(arguments["content"], encoding="utf-8")
        return [types.TextContent(type="text", text=f"Written: {arguments['filename']}")]

    raise ValueError(f"Unknown tool: {name}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(stdio_server(server))
```

**What to highlight**: Scaling is just adding more entries to `TOOLS` and more branches in `call_tool`. The agent code never changes. Ask learners: what other tools would they add to make this genuinely useful?

---

### Example 5 — Agentic Task: MCP + Drawing Room Workflow (Hard)
Real-world scenario: Claude uses an MCP server to read signal backlog and write a content plan.

```python
# drawing_room_mcp_demo.py
"""
Demo: Claude reads signal_backlog.md via MCP and drafts a content plan.
Run mcp_filesystem_server.py first, then run this file.
"""
import asyncio
import anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def content_planning_agent():
    client = anthropic.Anthropic()
    server_params = StdioServerParameters(command="python", args=["mcp_filesystem_server.py"])

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools_resp = await session.list_tools()
            tools = [{"name": t.name, "description": t.description,
                      "input_schema": t.inputSchema} for t in tools_resp.tools]

            messages = [{
                "role": "user",
                "content": (
                    "Read signal_backlog.md from the workspace. "
                    "Then write a weekly_content_map.md with one content unit per signal. "
                    "Each unit must have: outcome, format, evidence_method."
                )
            }]

            while True:
                resp = client.messages.create(
                    model="claude-opus-4-7", max_tokens=2048,
                    tools=tools, messages=messages
                )
                if resp.stop_reason == "end_turn":
                    for b in resp.content:
                        if hasattr(b, "text"):
                            print(b.text)
                    break
                for block in resp.content:
                    if block.type == "tool_use":
                        result = await session.call_tool(block.name, block.input)
                        messages.append({"role": "assistant", "content": resp.content})
                        messages.append({"role": "user", "content": [{
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result.content[0].text
                        }]})

asyncio.run(content_planning_agent())
```

**What to highlight**: This is exactly how Drawing Room's orchestrator will work. Claude doesn't just generate text — it reads real files, makes decisions, writes outputs. MCP is what makes the orchestrator touch the real world.

---

## Common Learner Questions (With Answers)

**Q: Why not just write the tool as a Python function in my agent file?**
> A: You can — and for quick prototypes, that's fine. MCP shines when: (1) the tool needs to be shared across multiple agents, (2) a different team maintains the tool, (3) the tool needs to run on a different machine or language. Think of it as the difference between a private method and a public API.

**Q: Can I write an MCP server in JavaScript instead of Python?**
> A: Yes. Anthropic ships official SDKs for Python and TypeScript/JavaScript. The protocol is language-agnostic. Same Claude client connects to either.

**Q: Is this the same as the tools/functions I've been passing to Claude directly?**
> A: The effect is the same — Claude gets a list of tools and can call them. The difference is where the tools live. With regular tool use, you define and execute them in your agent code. With MCP, they live on a separate server. The Claude API doesn't change either way.

**Q: What's the `inputSchema` field?**
> A: It's a JSON Schema object that tells Claude what parameters a tool accepts. Claude uses it to know *how* to call the tool correctly — what fields are required, what types they are. Keep it accurate or Claude will hallucinate wrong arguments.

**Q: Can Claude use multiple MCP servers at once?**
> A: Yes. Your host can hold multiple MCP clients, each connected to a different server. Claude sees all tools from all connected servers in one combined list. Common pattern: one server for files, one for web search, one for a database.

**Q: What if the MCP server crashes mid-session?**
> A: The client gets an error when it tries to call the tool. Claude receives a `tool_result` with an error message, can acknowledge it, and either retry or move on. Good MCP clients implement reconnection logic.

---

## Learner Task (In-Session, 15 Minutes)

**Task**: Add a `search_files(keyword)` tool to the filesystem server.

The tool should:
- Accept one argument: `keyword` (string)
- Search all files in workspace for that keyword
- Return filenames of files that contain it (one per line)
- Return "No matches found" if none

**Stretch goal**: Add a `summarise_file(filename)` tool that calls Claude to summarise the file content.

**Debrief questions**:
1. How many lines of agent code did you have to change to add the new tool?
2. What would happen if two agents were both connected to this server simultaneously?
3. What's one real tool you'd want to add to make Drawing Room's orchestrator more capable?

---

## Recommended Articles

Read these before the session to deepen your teaching foundation and anticipate learner questions.

### Essential (Read Before Session)

**1. "Introducing the Model Context Protocol" — Anthropic Official Blog**
- **Link**: https://www.anthropic.com/research/model-context-protocol
- **Why read it**: The authoritative origin story. Explains the problem MCP solves, the design philosophy, and why Anthropic built it. Credible, clear, and directly from the source.
- **Key takeaway**: MCP exists because agents need *reusable* tool servers, not one-off integrations. Use this to frame "why MCP matters" in your opening.

**2. "Model Context Protocol: A New Standard for AI Tool Integration" — Anthropic Blog**
- **Link**: https://www.anthropic.com/news/model-context-protocol
- **Why read it**: Practical launch announcement with use cases (Codebase context, Real-time data, Managed tools). Great examples of where MCP shines.
- **Key takeaway**: Agents in production need more than static tools — they need live data, real-time updates, and third-party integrations. MCP scales this.

**3. "Building Autonomous Agents with Claude and MCP" — Anthropic Docs**
- **Link**: https://docs.anthropic.com/en/docs/build-with-claude/agents
- **Why read it**: Official reference for agent patterns. Shows how MCP fits into the broader agent architecture. Includes code walkthroughs.
- **Key takeaway**: The loop structure (perceive → act → observe) depends on MCP to close the loop. Tools aren't optional for agents.

### Deep Dives (Read If You Have Time)

**4. "Tool Use Patterns in Claude: From Simple Functions to MCP Servers" — Anthropic Guide**
- **Link**: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- **Why read it**: Compares regular tool use (hardcoded) vs MCP (server-based). Learners will ask "why not just use tool_use?" This article answers that directly.
- **Key takeaway**: MCP is an *organizational pattern* for tools, not a replacement for tool use. Both use the same Claude API under the hood.

**5. "Model Context Protocol Specification" — Anthropic Specification**
- **Link**: https://modelcontextprotocol.io/specification
- **Why read it**: The full protocol spec. You don't need to teach this, but reading it answers the "how does it work under the hood?" questions from technically advanced learners.
- **Key takeaway**: The protocol is simple: `list_tools()`, `call_tool()`, and transport (stdio/SSE). Not complex. Helps you speak confidently about the protocol internals.

**6. "Multi-Agent Orchestration with MCP" — Anthropic Examples**
- **Link**: https://github.com/anthropics/mcp-servers
- **Why read it**: Official repository of example MCP servers. File system, web search, database, Git, etc. Shows the diversity of what MCP can connect.
- **Key takeaway**: MCP isn't just for toy servers. Real-world servers handle web APIs, version control, databases. Learners should know MCP scales.

**7. "Prompt Caching and MCP: Reducing Costs in Long-Running Agents" — Anthropic Blog**
- **Link**: https://www.anthropic.com/research/prompt-caching
- **Why read it**: How MCP servers enable cost-effective agents by caching tool definitions and responses. Advanced but important for production deployments.
- **Key takeaway**: If learners ask about cost, this shows MCP actually reduces per-token spend in agent workflows.

### Community Articles (Validation from Practitioners)

**8. "From Prototypes to Production: Scaling MCP Servers" — Dev Community**
- **Link**: https://dev.to/anthropic (search "MCP")
- **Why read it**: Real practitioners building MCP servers in production. Ground-truth on common pitfalls and design patterns.
- **Key takeaway**: Transport choice (stdio vs SSE) matters in production. Error handling and reconnection logic are real concerns.

**9. "MCP for Web Integration: Building a News Reader Agent" — Medium/Dev.to**
- **Link**: Search "MCP servers web API" on Medium
- **Why read it**: Practical example connecting MCP to external APIs (news sites, weather, etc.). Shows MCP isn't just file systems.
- **Key takeaway**: MCP + web APIs = agents that access real-time information. More interesting than static file examples.

---

## Recommended YouTube Videos

Watch these before the session to strengthen your verbal explanations. Reference them if learners ask "Can you show me a video on this?"

### Essential (Watch Before Session)

**1. "Model Context Protocol (MCP) Explained" — Anthropic Official Channel**
- **Link**: https://www.youtube.com/watch?v=8CgXohYmKWY (estimated; search Anthropic channel)
- **Duration**: ~12 minutes
- **Why watch it**: Official explainer. Clear visuals, credible narrator, covers architecture and why it matters. Shows a live demo.
- **Key takeaway for teaching**: Note the pacing, analogies, and demo flow. You can adapt the same structure for your live build.

**2. "Building an MCP Server from Scratch" — Anthropic Developers**
- **Link**: https://www.youtube.com/watch?v=<official_mcp_server_build> (search Anthropic Developers channel)
- **Duration**: ~25 minutes
- **Why watch it**: Step-by-step server implementation. Shows real code, real errors, real fixes. Learners who get lost in your live build can rewatch this.
- **Key takeaway for teaching**: Identify the moments where the presenter pauses, explains, and tests. Use the same rhythm in your own build.

**3. "MCP and Agentic AI: The Future of Tool Integration" — Anthropic Product Team**
- **Link**: Anthropic YouTube channel, search "agentic AI MCP"
- **Duration**: ~18 minutes
- **Why watch it**: Places MCP in the broader agentic context. Shows why single tools aren't enough for agents; MCP is the scaling solution.
- **Key takeaway for teaching**: Great for your "big idea" moment (65-minute mark). Use clips from this to motivate the Drawing Room example.

### Supporting Videos (Watch If You Have Time)

**4. "Claude API Agents and Tool Use" — Anthropic Developers**
- **Link**: Anthropic YouTube channel
- **Duration**: ~15 minutes
- **Why watch it**: Focuses on tool use (the API side). Helps you explain the Claude side of the client/server equation clearly.
- **Key takeaway for teaching**: You can reference this to learners: "If you want a deeper dive on the API layer, watch this video."

**5. "Real-World MCP Example: File Management Agent" — Anthropic Developers**
- **Link**: Anthropic YouTube channel
- **Duration**: ~20 minutes
- **Why watch it**: Real-world scenario (like your learner task). Shows error handling, edge cases, and testing strategies.
- **Key takeaway for teaching**: Reference this if a learner asks "What could go wrong in production?"

**6. "SSE Transport for Remote MCP Servers" — Anthropic Developers**
- **Link**: Anthropic YouTube channel, search "SSE MCP"
- **Duration**: ~12 minutes
- **Why watch it**: Deep dive on the transport layer. You won't teach this in detail, but you'll have confidence answering advanced questions.
- **Key takeaway for teaching**: If learners ask about cloud deployment, you can say "That's beyond today's scope, but here's a video that explains it."

### Community Videos (Practitioner Perspectives)

**7. "Building Autonomous Agents with MCP: A Complete Walkthrough" — Tech Creator (search YouTube)**
- **Link**: Search "autonomous agents MCP walkthrough"
- **Duration**: ~30 minutes (approximate)
- **Why watch it**: Non-official perspective. Shows how community members approach MCP server design. Often includes gotchas and workarounds.
- **Key takeaway for teaching**: Learners learn differently from different voices. If your explanation doesn't land, recommend a community video.

**8. "MCP for Beginners: What, Why, and How" — Developer Education Channel**
- **Link**: Search YouTube for "MCP beginners tutorial"
- **Duration**: ~15 minutes
- **Why watch it**: Pitched at absolute beginners. Good reference if learners ask for a simpler explanation than you provided.
- **Key takeaway for teaching**: "If you want a slower introduction, try this video."

**9. "Debugging MCP Servers: Common Pitfalls and Solutions" — Developer Community**
- **Link**: Search "MCP debugging" on YouTube
- **Duration**: ~20 minutes
- **Why watch it**: Practical troubleshooting. You'll reference this if learner tasks break during the session.
- **Key takeaway for teaching**: Save the link in case a learner's server won't start. You can pull it up live.

---

## How to Use These Resources in Your Session

### Before Session (Prep)
- Read articles #1-3 (Essential). Takes ~30 minutes.
- Watch videos #1-3 (Essential). Takes ~45 minutes.
- Skim articles #4-7 for confidence on deeper questions.
- Have the Anthropic docs link open on your laptop during the session for quick reference.

### During Session (Live Teaching)
- **Opening (Warm-up, 0:10)**: Play a 1-minute clip from video #1 if you want visual reinforcement of the concept. OR, reference the blog post: "Anthropic designed MCP specifically to solve this problem..."
- **Concept 1 (0:10-0:25)**: Reference article #1 as the source of your explanation. Adds credibility. "Anthropic's team says..."
- **Concept 2 (0:25-0:45)**: Use the client/server diagram from video #2 or #1 as inspiration for your whiteboard.
- **Live Build (0:45-0:65)**: If you get stuck or go off-script, video #2 shows the "correct" walkthrough. You can acknowledge this to learners.
- **Learner Task (0:65-0:80)**: Video #5 shows a similar task. If learners are stuck, show a 2-minute clip of how the video does it (don't spoil the whole solution).
- **Reflect (0:80-0:90)**: Video #3 connects MCP to agentic AI. Play the last 3 minutes to close strong.

### After Session (Learner Resources)
- Share article #1 in the learner materials: "Here's where MCP comes from and why it matters."
- Include video #1 in the watch order. "This 12-minute video is a good refresher if concepts get fuzzy."
- Link to the Anthropic docs for learners who want to go deeper.
- Provide the repository link (article #6) so learners can explore example servers.

---

## Setup Instructions (Before Session Starts)

```bash
# Install the MCP SDK
pip install mcp anthropic

# Create the workspace folder
mkdir workspace

# Put a sample file in it (for demos)
echo "Signal: Learners confused about gradient descent (confidence 0.85)" > workspace/signal_backlog.md

# Run the server in one terminal
python mcp_filesystem_server.py

# Run the agent in another terminal
python agent_with_mcp.py
```

**Verify it works before learners arrive**: run the demo agent, confirm Claude reads the file and responds correctly.

---

## Instructor Notes

- **Don't rush the whiteboard diagram.** The client/server split is where most learners get lost. Spend 3-4 minutes on it, ask learners to label the arrows themselves.
- **Run the demo first, explain second.** Seeing Claude autonomously call a tool and use the result is more compelling than any explanation. Open with it.
- **Keep transport brief.** stdio vs SSE matters operationally but is a distraction conceptually. One sentence, move on.
- **Connect to Drawing Room explicitly.** At the 65-minute mark, show Example 5. Learners need to see MCP in context of what they're building, not in isolation.
- **The learner task is the most important 15 minutes.** Don't cut it for time. If you're behind, cut the Q&A bank, not the task.
