#!/bin/bash
# Block dangerous commands before execution
# Prevents: force-push to main, .env commits, ElevenLabs without permission

COMMAND="$1"
ARGS="$2"

# Block force-push to main
if [[ "$COMMAND" == "git" ]] && [[ "$ARGS" == *"push"* ]] && [[ "$ARGS" == *"--force"* ]]; then
  if [[ "$ARGS" == *"main"* ]] || [[ "$ARGS" == *"origin/main"* ]]; then
    echo "❌ BLOCKED: Force-push to main is forbidden. Use normal push instead."
    exit 1
  fi
fi

# Block .env file commits. Templates (.env.example / .env.sample / .env.template)
# hold placeholders, not values, and are meant to be tracked -- the old rule
# blocked them too, so a rewritten template could not be committed at all.
# They are removed from the string first; any other ".env" still blocks.
if [[ "$COMMAND" == "git" ]] && [[ "$ARGS" == *"add"* ]]; then
  REAL_ENV="${ARGS//.env.example/}"
  REAL_ENV="${REAL_ENV//.env.sample/}"
  REAL_ENV="${REAL_ENV//.env.template/}"
  if [[ "$REAL_ENV" == *".env"* ]]; then
    echo "❌ BLOCKED: Cannot commit .env files. These should be in .gitignore."
    exit 1
  fi
fi

# Block ElevenLabs API calls without explicit permission
if [[ "$COMMAND" == "python"* ]] && [[ "$ARGS" == *"eleven"* ]] || [[ "$ARGS" == *"ElevenLabs"* ]] || [[ "$ARGS" == *"voiceover_generation"* ]]; then
  if [[ ! "$ARGS" == *"--permission-granted"* ]]; then
    echo "❌ BLOCKED: ElevenLabs API calls require explicit permission. Add --permission-granted flag only when user authorizes."
    exit 1
  fi
fi

exit 0
