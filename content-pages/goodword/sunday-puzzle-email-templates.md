# Good Word Sunday Word — Email Templates

Two emails per week. The **Challenge** goes out Sunday morning. The **Reveal** goes out the following Sunday morning, paired with the new week's challenge.

---

## Template 1: Challenge Email

**Subject line:** This Week's Sunday Word (Week {{WEEK_NUMBER}})

**From:** sunday@thegoodwordgame.com

**Body:**

---

**THE GOOD WORD GAME**
*The Sunday Word*

---

**Week {{WEEK_NUMBER}}: {{PUZZLE_TYPE}}**

{{PUZZLE_PROMPT}}

**Think you know it?** Reply to this email with your answer. One winner will be named next Sunday.

---

*The Sunday Word is a weekly challenge from The Good Word Game. Five verses, one chance, every day — play the daily at thegoodwordgame.com.*

*Groundwork Studios*

---

## Template 2: Reveal + Winner Email

**Subject line:** Last Week's Answer + This Week's Sunday Word (Week {{WEEK_NUMBER}})

**From:** sunday@thegoodwordgame.com

**Body:**

---

**THE GOOD WORD GAME**
*The Sunday Word*

---

**Last Week's Answer**

{{PREVIOUS_REVEAL_PARAGRAPH}}

**This week's winner:** {{WINNER_FIRST_NAME}} {{WINNER_LAST_INITIAL}}., {{CHURCH_NAME}} — {{CITY}}, {{STATE}}

Congratulations — you knew your Word.

---

**This Week's Challenge: {{PUZZLE_TYPE}}**

{{PUZZLE_PROMPT}}

**Think you know it?** Reply to this email with your answer. One winner will be named next Sunday.

---

*The Sunday Word is a weekly challenge from The Good Word Game. Five verses, one chance, every day — play the daily at thegoodwordgame.com.*

*Groundwork Studios*

---

## Template 3: Week 1 Launch Email (first week only — no reveal section)

**Subject line:** Introducing The Sunday Word

**From:** sunday@thegoodwordgame.com

**Body:**

---

**THE GOOD WORD GAME**
*The Sunday Word*

---

**Welcome to The Sunday Word.**

Every Sunday, we'll send you one Bible challenge — a riddle, a scramble, a verse to complete, or a question that'll make you reach for your KJV. Reply with your answer. If you get it right, you might be the one we name next week.

No prizes. Just the satisfaction of knowing your Word — and your church getting a little shoutout.

Let's start.

---

**Week 1: {{PUZZLE_TYPE}}**

{{PUZZLE_PROMPT}}

**Think you know it?** Reply to this email with your answer. One winner will be named next Sunday.

---

*The Sunday Word is a weekly challenge from The Good Word Game. Five verses, one chance, every day — play the daily at thegoodwordgame.com.*

*Groundwork Studios*

---

## Operational Notes

**Weekly workflow (15 minutes):**
1. Monday–Saturday: Correct replies arrive in the sunday@ inbox
2. Saturday evening or Sunday morning: Pick one correct reply as the winner
3. Fill in the winner's name, last initial, church, and city/state in the Reveal template
4. The reveal paragraph and new challenge are pre-written in `sunday-puzzle-challenges.json` — just copy and paste
5. Send

**Winner selection:**
- Any correct answer qualifies
- Pick one at random, or pick the first correct reply, or pick the one with the best church name — your call
- If nobody gets it right, skip the winner line and just reveal the answer: "Nobody got this one — here's the answer."

**If a winner doesn't name their church:**
- Use: "{{FIRST_NAME}} {{LAST_INITIAL}}., {{CITY}}, {{STATE}}" (drop the church line)

**Email platform setup (Beehiiv, Buttondown, or similar):**
- The challenges are NOT a drip sequence — they run on a real weekly calendar
- Week 1 goes out on your chosen launch Sunday
- Week 52 goes out 51 weeks later
- After Week 52, you can start a new year of challenges or loop back to Week 1 (most subscribers won't remember)
