# MCP Servers — Instructor Slides

## Presentation Guide
- Use reveal-md, markdown-to-slides, or convert to PowerPoint
- Navigate with arrow keys (→ for next slide, ← for previous)
- Press 'S' for speaker notes (if using reveal-md)
- Each slide has presenter notes below the `---` separator

---

# Slide 1: Title

## Model Context Protocol
### Giving AI Agents Hands

**Agentic AI Course | Week 19 | Today**

*Topics:*
- What is MCP?
- Why it matters for agents
- Building and using MCP servers
- Hands-on: extend an MCP server

---

### Speaker Notes
- Welcome learners; set expectations for 90 min
- Say: "By the end, you'll build an MCP server and have Claude use it"
- Energy check: ask "who's built an API before?" to gauge audience

---

# Slide 2: The Problem

## Without MCP

```
Agent A          Agent B          Agent C
  ↓                ↓                ↓
read_file()    read_file()      read_file()
write_file()   write_file()     write_file()
search()       search()         search()

❌ Code duplication
❌ Inconsistent implementations
❌ Updates to one agent don't help others
```

---

### Speaker Notes
- Point to the duplication: every agent rewrites the same tools
- Ask: "What happens when you find a bug in read_file()?"
- Answer: "You fix it in three places, maybe miss one"
- Frustration is the motivation

---

# Slide 3: The Solution — MCP

## With MCP

```
Agent A    Agent B    Agent C
  ↓          ↓          ↓
     [MCP Client]
          ↓
    [MCP Server]
     (tool impl)

✅ One source of truth
✅ Reusable across agents
✅ Update once, benefit everywhere
```

---

### Speaker Notes
- Highlight the client/server split
- Say: "MCP is USB for AI. One standard, many agents can use it"
- The server is built once; agents connect to it
- Emphasize: agent code doesn't change when you add tools

---

# Slide 4: What is MCP?

## Model Context Protocol

A **standard protocol** for connecting external tools to Claude.

**Key idea**: Tools live on a separate **server**. Your agent's **client** connects to it. Claude decides when to use the tools.

```
Claude:    "What tools do I have?"
Client:    [asks server]
Server:    "You have: read_file, write_file, search"
Claude:    "I'll call read_file"
Client:    [sends request to server]
Server:    [executes tool, returns result]
Client:    [shows result to Claude]
Claude:    [uses result in response]
```

---

### Speaker Notes
- Walk through the flow step by step
- Pause after each step, ask learners to predict the next one
- Highlight: Claude never talks directly to the server
- The client is the middleman

---

# Slide 5: Architecture Diagram

## MCP Components

```
┌─────────────────────────────────────┐
│         YOUR APPLICATION            │
│  (Host — e.g., your agent code)     │
│                                     │
│  ┌──────────────────────────────┐   │
│  │    MCP Client (SDK)          │   │
│  │ • Connects to server         │   │
│  │ • Fetches tool list          │   │
│  │ • Calls tools                │   │
│  └──────────────────────────────┘   │
│              ↑                       │
└──────────────┼───────────────────────┘
               │ stdio or SSE
               ↓
    ┌──────────────────────┐
    │   MCP Server         │
    │  • Defines tools     │
    │  • Executes tools    │
    │  • Returns results   │
    └──────────────────────┘
```

---

### Speaker Notes
- Point to each component and name it
- Say: "The client is like a waiter. The server is like the kitchen."
- Ask: "Where does Claude fit?" 
- Answer: "Claude talks to the client, tells it which tools to use"
- Transport (stdio/SSE) is technical detail; say "local vs remote, we'll cover it briefly"

---

# Slide 6: The Restaurant Analogy

## Let's Make It Real

```
Customer (Claude)
    ↓ "I want pasta and coffee"
    ↓
Waiter (MCP Client)
    ↓ relays order
    ↓
Kitchen (MCP Server)
    ↓ makes food
    ↓
Waiter (MCP Client)
    ↓ brings plate back
    ↓
Customer (Claude) "Delicious! Now let me decide the next course"
```

**Key insight**: The customer never goes to the kitchen. The waiter handles it.

---

### Speaker Notes
- Make this relatable; learners understand restaurants
- Emphasize the waiter (client) role: it translates requests and brings results back
- Say: "This is the MCP relationship"

---

# Slide 7: Demo Time (Part 1)

## What You're About To See

I'm going to:
1. **Run an MCP server** on my machine (the kitchen)
2. **Connect Claude** via the SDK (the waiter)
3. **Ask Claude a question** that requires using the server's tools
4. **Claude will autonomously** read a file and respond

Watch what happens. Don't worry about understanding every detail yet.

---

### Speaker Notes
- Set expectations: "This will feel like magic for a moment. By the end, you'll know exactly how it works."
- Terminal 1: run `python mcp_filesystem_server.py`
- Terminal 2: run `python agent_with_mcp.py "Read signal_backlog.md and tell me the top signal"`
- Let learners watch Claude autonomously call the tool and use the result

---

# Slide 8: Demo Time (Part 2)

## What Just Happened

```
You:     "Read signal_backlog.md"
   ↓
Claude:  "I need to read a file. What tools do I have?"
   ↓
Client:  [asks server for tool list]
   ↓
Server:  "I have: read_file, write_file, list_files"
   ↓
Claude:  "I'll use read_file with filename=signal_backlog.md"
   ↓
Client:  [calls server with that request]
   ↓
Server:  [reads file, returns content]
   ↓
Claude:  "I read the file. Here's what it says: ..."
   ↓
You:     [see the answer]
```

**No manual steps. Claude did it all autonomously.**

---

### Speaker Notes
- Replay the demo flow with explicit steps
- Emphasize "autonomously" — Claude decided to use the tool without being told
- Say: "That's agentic behavior. That's the power of MCP."

---

# Slide 9: MCP Server — What You Build

## Structure of an MCP Server

```python
from mcp.server import Server

server = Server("my-server")

@server.list_tools()  # "What tools do you have?"
async def list_tools():
    return [
        Tool(name="read_file", description="...", inputSchema={...}),
        Tool(name="write_file", description="...", inputSchema={...}),
    ]

@server.call_tool()   # "Execute this tool"
async def call_tool(name: str, arguments: dict):
    if name == "read_file":
        return [TextContent(text=file_content)]
    elif name == "write_file":
        return [TextContent(text="File written")]
```

**Two methods. That's it.**

---

### Speaker Notes
- Point out the two decorator functions: `list_tools` and `call_tool`
- Say: "list_tools tells Claude what's available. call_tool does the work."
- Ask: "Where's the actual tool logic?" 
- Answer: "Inside call_tool. You check the name and arguments, then do the work."
- This is the template they'll extend during the assignment

---

# Slide 10: MCP Client — What You Connect

## How Your Agent Uses MCP

```python
import anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        
        # Fetch tools from the server
        tools = await session.list_tools()
        
        # Let Claude use them
        response = client.messages.create(
            model="claude-opus-4-7",
            messages=[{"role": "user", "content": "Read signal_backlog.md"}],
            tools=tools  # ← Claude sees these tools
        )
        
        # If Claude calls a tool, execute it
        if response.tool_calls:
            result = await session.call_tool(name, arguments)
```

**Three steps: initialize, fetch tools, pass to Claude.**

---

### Speaker Notes
- Walk through the code block line by line
- Pause at `tools=tools` — this is where Claude learns what's available
- Say: "The agent code doesn't change when you add new tools to the server. The agent just re-fetches the list."
- This is the key insight: loose coupling

---

# Slide 11: The Agentic Loop

## How MCP Powers Agents

```
┌────────────────────────────────┐
│  AGENT LOOP                    │
│                                │
│  1. Claude thinks: "What can   │
│     I do?"                     │
│                                │
│  2. Client fetches tool list   │
│     from server                │
│                                │
│  3. Claude decides: "I'll use  │
│     read_file()"               │
│                                │
│  4. Client calls server with   │
│     the request                │
│                                │
│  5. Server executes; returns   │
│     result                     │
│                                │
│  6. Claude uses result in its  │
│     reasoning                  │
│                                │
│  7. Loop until done (or repeat)│
│                                │
└────────────────────────────────┘
```

**This loop is what makes agents autonomous.**

---

### Speaker Notes
- Trace through the loop with your finger
- Say: "Without MCP, Claude can't actually *do* anything. It can only talk."
- Say: "MCP is what gives agents the ability to act on the world."
- Ask: "What would happen if Claude couldn't call any tools?"
- Answer: "It would be stuck — reasoning but unable to change anything."

---

# Slide 12: Real-World Example — Drawing Room

## How MCP Powers the Orchestrator

```
ContentOrchestrator (your agent)
         ↓
    [MCP Client]
         ↓
    [MCP Server: FileSystem]
    • read_file()
    • write_file()
    • list_files()
    
    [MCP Server: LMS API]
    • get_submissions()
    • post_assignments()
    
    [MCP Server: Video Tools]
    • transcode()
    • extract_audio()
```

**Claude orchestrator connects to multiple servers. Each has its own tools.**

---

### Speaker Notes
- This is the moment to connect to their real project
- Say: "Drawing Room's orchestrator will use MCP servers to read signals, write content plans, upload assets."
- Ask: "Why not just hardcode all that into the orchestrator?"
- Answer: "Because different teams maintain different tools. MCP keeps them separate but connected."

---

# Slide 13: Transport — Stdio vs SSE

## How Client and Server Talk

### Stdio (Local)
```
Your machine
┌─────────────────────┐
│ Agent     Server    │
│ (client) (process)  │
│    ↔ stdin/stdout   │
└─────────────────────┘

Simple, local, no network
```

### SSE (Remote)
```
Your machine              Cloud
┌──────────┐            ┌──────────┐
│  Agent   │            │ Server   │
│ (client) │ ←─HTTP SSE→ │(process) │
└──────────┘            └──────────┘

Over the internet, persistent connection
```

---

### Speaker Notes
- Don't spend too long here — it's technical detail
- Say: "For this session, we're using stdio because it's simpler."
- Say: "In production, you might use SSE to connect to a cloud server."
- Ask: "Why would you want a remote server?"
- Answer: "Tools are resource-heavy (video processing, APIs). Keep them separate from your agent."

---

# Slide 14: Live Build — Part 1

## Let's Build Together

I'm going to build a minimal MCP server with you. You'll see:
1. **Tool definition** (what it can do)
2. **Tool execution** (how it works)
3. **Connection** (how Claude uses it)

**Don't code yet. Watch first. You'll do this in the assignment.**

---

### Speaker Notes
- Open your editor (VS Code, etc.)
- Type out the server code slowly, narrating each section
- Start with:
  ```python
  from mcp.server import Server
  from mcp import types
  
  server = Server("demo-server")
  ```
- Say: "This creates a server called demo-server"
- Don't go too fast; learners are watching and processing

---

# Slide 15: Live Build — Part 2

## Adding a Tool

```python
@server.list_tools()
async def list_tools():
    return [
        types.Tool(
            name="get_today",
            description="Returns today's date",
            inputSchema={"type": "object", "properties": {}, "required": []}
        )
    ]
```

**This tells Claude: "I have a tool called get_today that takes no arguments."**

---

### Speaker Notes
- Type this decorator and function
- Pause on `inputSchema` — explain briefly: "This is a JSON Schema. It describes the inputs. Empty object = no inputs needed."
- Say: "When Claude connects, it will see this tool in the list."

---

# Slide 16: Live Build — Part 3

## Executing the Tool

```python
@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "get_today":
        from datetime import date
        return [types.TextContent(type="text", text=str(date.today()))]
    
    raise ValueError(f"Unknown tool: {name}")
```

**When Claude calls get_today, this code runs and returns today's date.**

---

### Speaker Notes
- Type this function
- Narrate: "First, we check if the tool name matches. If it does, we do the work (get today's date). If it doesn't, we raise an error."
- Say: "As you add more tools, you just add more if-branches here."
- Ask: "Where's the actual date logic?"
- Answer: "import datetime, then date.today(). Simple."

---

# Slide 17: Live Build — Part 4

## Start the Server

```python
if __name__ == "__main__":
    import asyncio
    from mcp.server.stdio import stdio_server
    
    asyncio.run(stdio_server(server))
```

**This starts the server and listens for client requests.**

---

### Speaker Notes
- Type this block
- Say: "That's the whole server. Three parts: list_tools, call_tool, start."
- Run it: `python mcp_date_server.py`
- Show: "Server is running. Listening. Waiting for a client to connect."

---

# Slide 18: Live Build — Part 5

## Connect Claude

In another terminal:

```python
import anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async with stdio_client(StdioServerParameters(command="python", args=["mcp_date_server.py"])) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        tools = await session.list_tools()
        
        # Ask Claude to use the tool
        response = client.messages.create(
            model="claude-opus-4-7",
            messages=[{"role": "user", "content": "What's today's date?"}],
            tools=[{"name": t.name, "description": t.description, "input_schema": t.inputSchema} for t in tools]
        )
```

---

### Speaker Notes
- Type this code (or show a pre-written file)
- Run it
- Watch Claude autonomously call the get_today tool
- Show the output: "Today is [date]"
- Say: "That's it. That's how MCP works."

---

# Slide 19: The Agent Loop in Action

## What We Just Saw

```
You: "What's today's date?"
  ↓
Claude: "I have a question that needs a tool."
  ↓
Client: [asks server what tools it has]
  ↓
Server: "I have get_today"
  ↓
Claude: "I'll use get_today()"
  ↓
Client: [calls server]
  ↓
Server: [returns date]
  ↓
Claude: "Today is [date]"
  ↓
You: [see the answer]
```

**All autonomous. Claude decided to use the tool without being told.**

---

### Speaker Notes
- Replay the flow step by step
- Emphasize "autonomous" — this is agentic behavior
- Say: "This is the foundation of how Drawing Room's orchestrator will work."

---

# Slide 20: Now It's Your Turn

## The Assignment

Add a `search_files(keyword)` tool to the **filesystem server**.

**What it does**:
- Takes one argument: `keyword` (string)
- Searches all files in workspace for that keyword
- Returns matching filenames (one per line)
- Returns "No matches found" if none

**Example**:
```
User: "Find files mentioning gradient"
Claude: [calls search_files(keyword="gradient")]
Server: [returns: "notes.txt\ntutorial.md"]
Claude: "Found 2 files: notes.txt and tutorial.md"
```

---

### Speaker Notes
- Hand out the filesystem server template (or have it on screen)
- Say: "You have 15 minutes. The instructor is here to help."
- Encourage: "This is the same pattern we just built together. You've got this."

---

# Slide 21: Assignment Tips

## How to Approach It

1. **Define the tool** in `list_tools()`:
   - name: "search_files"
   - description: "Search files for a keyword"
   - inputSchema: {"properties": {"keyword": {"type": "string"}}, "required": ["keyword"]}

2. **Implement it** in `call_tool()`:
   - Add an if-branch: `if name == "search_files"`
   - Use Python to search workspace files
   - Return matching filenames

3. **Test it**:
   - Run the server
   - Use Claude to ask: "Search for 'gradient'"
   - Confirm Claude calls your tool and gets results

---

### Speaker Notes
- Walk through each step
- Show a partial code snippet (not the full solution) to guide them
- Say: "Starter code is in the template. Finish it."
- Circulate and help anyone stuck

---

# Slide 22: Stretch Goal

## If You Finish Early

Add a `summarise_file(filename)` tool:
- Takes one argument: `filename` (string)
- Reads the file
- Calls Claude to write a 1-paragraph summary
- Returns the summary

**Hint**: Use `anthropic.Anthropic()` to call Claude from inside the tool.

---

### Speaker Notes
- This is for advanced learners who finish first
- Explain: "Now you're using MCP to call Claude. It's tools all the way down."
- Encourage creative additions if they finish both

---

# Slide 23: Debrief

## Think About These

1. **How much of your agent code changed when you added the new tool?**
   - (Answer: zero. You didn't touch the client.)

2. **What would happen if two agents connected to this server?**
   - (Answer: both see the same tools; server can handle concurrent calls)

3. **What's one real MCP server you'd build for Drawing Room?**
   - (Let learners brainstorm: file system, LMS API, video processing, etc.)

---

### Speaker Notes
- Facilitate discussion
- Listen to their answers
- Connect back to Drawing Room: "That's exactly the problem MCP solves."

---

# Slide 24: Why MCP Matters

## The Big Picture

Without MCP:
- ❌ Every agent rewrites the same tools
- ❌ Tools are tightly coupled to the agent
- ❌ Updating a tool means updating the agent
- ❌ No sharing across teams

With MCP:
- ✅ Write tools once, use everywhere
- ✅ Tools are independent, loosely coupled
- ✅ Update tools without touching the agent
- ✅ Teams work independently

**MCP is how you build scalable, maintainable agents.**

---

### Speaker Notes
- Draw a before/after comparison
- Say: "This is why Anthropic built MCP."
- Say: "This is why Drawing Room uses it."

---

# Slide 25: MCP Powers Drawing Room

## From Signals to Published Assets

```
Orchestrator ←→ MCP Server (File System)
    ↓
Read signal_backlog.md
    ↓
Claude plans content
    ↓
Write weekly_content_map.md
    ↓
Generate learner packs
    ↓
MCP Server (Video Tools)
    ↓
Transcode, segment, edit
    ↓
MCP Server (LMS API)
    ↓
Publish assets
```

**MCP is the glue. It's how the orchestrator interacts with the real world.**

---

### Speaker Notes
- Trace through the Drawing Room flow
- Point out: "Every tool is on a separate server. The orchestrator stays simple."
- Say: "By the end of this course, you'll understand how all this works."

---

# Slide 26: Key Takeaways

## What You Learned Today

1. **MCP is a protocol** for connecting tools to Claude
2. **Servers expose tools; clients use them** (separation of concerns)
3. **Claude decides autonomously** when to call tools (agentic)
4. **You can build MCP servers** with just Python and the SDK
5. **MCP scales** because tools are reusable across agents
6. **Drawing Room uses MCP** to read, process, and publish content

---

### Speaker Notes
- Summarize in one sentence each
- Emphasize: "You can build this. You just did in the assignment."

---

# Slide 27: Resources

## Learn More

**Official Anthropic Documentation**:
- [MCP Quickstart](https://modelcontextprotocol.io)
- [Python SDK Examples](https://github.com/anthropics/mcp/tree/main/examples)

**Try at Home**:
- Build an MCP server for something you care about (weather API, personal files, notes)
- Connect Claude to it
- Let Claude explore

**Next Session**:
- How to deploy MCP servers (stdio → SSE)
- Multi-server architectures
- Error handling and resilience

---

### Speaker Notes
- Share links in the chat or email
- Encourage: "Try building your own server this week."
- Preview next session to build momentum

---

# Slide 28: Questions?

## Open Discussion

What questions do you have?

- About MCP?
- About the assignment?
- About drawing room?
- About agents?

**No question is too small. Ask.**

---

### Speaker Notes
- Open the floor
- Have extra examples ready if needed
- Answer thoroughly; don't rush
- Point to slides/code if explaining

---

# Slide 29: Thank You

## You Just Learned MCP

You came in asking "What's MCP?" and you're leaving knowing:
- ✅ What it is
- ✅ How it works
- ✅ How to build a server
- ✅ How to connect Claude
- ✅ Why it matters for agents

**You're ready to use MCP in your projects.**

Next week: we build more. See you then!

---

### Speaker Notes
- Celebrate their learning
- Remind them: "You wrote code, got Claude to use it, and understood the architecture. That's solid progress."
- Thank them for their attention and engagement
