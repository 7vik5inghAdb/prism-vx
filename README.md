# PRISM

A tool that lets you run pretend user-research studies — type in a research question, pick an audience, and a bunch of AI "people" answer your survey for you. You get a full report in about 5 minutes that looks like a real research deliverable.

Two of the studies are already done and saved (Firefly Creator Offer + Adobe Express India). You can click through those without paying for anything.

---

## How to run it on your computer (5 steps, ~10 minutes)

### Step 1 — Install Node

Node is the thing that runs the app. Download and install it from here:
👉 **https://nodejs.org/** (pick the big green button on the left)

To check it worked, open the Terminal app (on Mac: Spotlight → "Terminal") and type:
```
node --version
```
You should see something like `v20.something`. If you do, you're good.

---

### Step 2 — Download the code

Still in the Terminal, paste this and press Enter:
```
git clone https://github.com/7vik5inghAdb/prism-vx.git
cd prism-vx
```

This downloads the project into a folder called `prism-vx` and moves you into it.

---

### Step 3 — Install the project's bits

Type this and press Enter:
```
npm install
```

Takes about a minute. You'll see a lot of text scrolling. That's normal. Wait for it to finish (the cursor comes back to a fresh line).

---

### Step 4 — Add your secret key

The app talks to Claude (an AI). To do that it needs your own key.

1. Go to **https://console.anthropic.com**, sign in, click "API Keys", click "Create Key", copy the key.
2. In the Terminal, type:
   ```
   echo "ANTHROPIC_API_KEY=paste-your-key-here" > .env.local
   ```
   Replace `paste-your-key-here` with the actual key you copied.

**Just want to look at the saved demos?** You can skip this and put any text after `=`. The saved demos don't talk to the AI.

---

### Step 5 — Start the app

Type:
```
npm run dev
```

Wait for the line that says `✓ Ready in [some seconds]`.

Then open your browser and go to:
👉 **http://localhost:3000**

---

## What you'll see

A welcome screen with cards. Click any card with a checkmark-y look:

- **Subscriber survey — Firefly Creator Offer** — a real 105-person survey, already done
- **Positioning test — Adobe Express (India)** — a real 64-person tagline test, already done

You'll land on Step 1 with everything pre-filled. Hit the **Confirm** / **Continue** button at each step to walk through the 5-step pipeline (research setup → personas → survey design → respondents → final report). The whole thing is instant because the work was already saved.

Want to make your own from scratch? Click **Start from scratch** and fill in your own question. This time it WILL talk to the AI (and use a few dollars from your Anthropic account — see below).

---

## Stopping the app

In the Terminal where you ran `npm run dev`, press **Ctrl + C**. That's it.

---

## When something goes wrong

| What you see | What to do |
|---|---|
| "node: command not found" | You didn't install Node in Step 1. Go back and do that. |
| "Address already in use" / "port 3000 is taken" | Another app is using port 3000. Close it, or restart your computer. |
| Browser shows nothing at localhost:3000 | Wait a few more seconds. First load can take 30 seconds. |
| Demo card jumps you past Step 1 | Click the **New** button in the top bar of the app, then click the card again. |

---

## How much does it cost?

- **Just clicking the saved demo cards: $0** (literally zero — they're already done, the app just shows you the results)
- **Running your own study (small, ~10 people): about $1**
- **Running your own study (full, 64 people): about $4-5**
- **Running your own study (max, 100 people): about $6-8**

You only pay Anthropic, only when YOU click "Start from scratch" and run the AI. Nothing else costs money.

---

## More detailed instructions

If you want the techy version with build commands, deployment to Vercel, runner scripts, and so on — see **[RUNNING.md](RUNNING.md)** in the same folder.
