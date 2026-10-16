# SMS Integration Kit

Send a **message** or **announcement** directly to Ethiopian phone numbers from a web app. The Next.js demo in `apps/web` is a learning UI. The reusable piece is `packages/sms` — copy that into other systems later.

## Run it

```bash
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Paste numbers like `0911 234 567` or `+251911234567`, write the text, send. Each number gets its own outbox row.

Default provider is **mock**: nothing hits a real phone. Use **Mark delivered / failed** and **Simulate a reply** to see the full flow.

## Send to a real phone (AfroMessage)

1. Create an account at [afromessage.com](https://afromessage.com/) and request their free/beta test if it is still offered.
2. Put this in `apps/web/.env` (do not commit it):

```env
DATABASE_URL="file:./dev.db"
SMS_PROVIDER="afromessage"
AFROMESSAGE_TOKEN="your-token"
AFROMESSAGE_IDENTIFIER_ID="your-identifier"
AFROMESSAGE_SENDER_NAME="your-sender"
```

3. Restart `npm run dev`, paste your own number, send. The SMS should arrive on the SIM.

Delivery status (`delivered`) needs AfroMessage to call your app. Localhost cannot receive that unless you expose a tunnel:

```env
SMS_CALLBACK_BASE_URL="https://your-ngrok-or-cloudflare-url"
```

Without a tunnel, a real send still works; status may stay at `sent`.

## Copy into another app

1. Copy `packages/sms`.
2. Call `createSmsProvider()` and `parsePhoneList()` from a **server** route only.
3. Persist one message per recipient before `provider.send()`.
4. Point the provider callback/webhook at your `/api/webhooks/sms/status` and inbound URL.

Add a new carrier by implementing `SmsProvider` in `packages/sms/src/providers` and registering it in `createSmsProvider`. Do not call vendor APIs from the browser.

## Phone rules

Ethiopian mobiles normalize to `+2519XXXXXXXX`. Landlines and foreign numbers are rejected on purpose so a school or ops app does not silently bill the wrong destination. Extend `packages/sms/src/phone.ts` if you need other countries later.

## Two-way replies

A real parent reply needs a **short code** from the SMS provider. The inbound webhook is already wired (`POST /api/webhooks/sms/inbound`). Until you have a short code, use mock simulation.
