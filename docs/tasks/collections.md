# Collections Schema

## Overview
Все коллекции Payload CMS для проекта.

---

## Users

**Slug:** `users`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | text | ✅ | Login username (unique, immutable) |
| `name` | text | ✅ | Display name (unique) |
| `email` | email | ❌ | Email (Payload default) |
| `password` | password | ✅ | Hashed password |
| `roles` | select | ✅ | admin, player, moderator |
| `isSystemVerified` | checkbox | ✅ | Verified in-game |
| `avatar` | upload | ❌ | Profile picture |
| `friends` | array | ❌ | Friends list |
| `friends.user` | relationship | ✅ | Friend user reference |
| `friends.addedAt` | date | ✅ | When added |
| `ingameStats` | group | ❌ | DDNet statistics |
| `ingameStats.points` | number | ❌ | Total points |
| `ingameStats.skin` | text | ❌ | Skin name |
| `ingameStats.bodyColor` | number | ❌ | Body color code |
| `ingameStats.feetColor` | number | ❌ | Feet color code |
| `activeGame` | relationship | ❌ | Current active game |
| `totalGamesPlayed` | number | ❌ | Total games |
| `totalGamesWon` | number | ❌ | Total wins |

---

## Bingo

**Slug:** `bingo`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | text | ✅ | Game title |
| `mode` | select | ✅ | solo, team |
| `isPublic` | checkbox | ❌ | Visible in lobby |
| `category` | select | ✅ | DDNet category |
| `subcategory` | select | ❌ | For ddmax/oldschool |
| `gridSize` | select | ✅ | 3x3, 5x5, 7x7 |
| `winCondition` | select | ✅ | line, cross, full_house |
| `difficultyRange.min` | number | ❌ | Min stars |
| `difficultyRange.max` | number | ❌ | Max stars |
| `maps` | array | ✅ | Grid maps |
| `maps.mapName` | text | ✅ | Map name |
| `maps.position` | number | ✅ | Grid position (0-48) |
| `teams` | array | ✅ | Teams |
| `teams.teamName` | text | ✅ | Team name |
| `teams.color` | select | ✅ | Team color |
| `teams.players` | array | ✅ | Team players |
| `teams.players.user` | relationship | ✅ | Player user |
| `teams.players.isReady` | checkbox | ❌ | Ready status |
| `teams.completedCells` | array | ❌ | Completed cells |
| `teams.teamStatus` | select | ✅ | not_ready, ready, playing, winner, loser |
| `gameStatus` | select | ✅ | waiting, ready, in_progress, completed, cancelled |
| `winnerTeam` | number | ❌ | Winner team index |
| `createdBy` | relationship | ✅ | Creator user |
| `inviteCode` | text | ❌ | Private game code |
| `startedAt` | date | ❌ | Game start time |
| `completedAt` | date | ❌ | Game end time |
| `duration` | number | ❌ | Duration in minutes |

---

## Races

**Slug:** `races`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | text | ✅ | Race title |
| `mode` | select | ✅ | solo, multiplayer |
| `isPublic` | checkbox | ❌ | Visible in lobby |
| `category` | select | ✅ | DDNet category |
| `totalRounds` | number | ✅ | Rounds to win |
| `currentRound` | number | ❌ | Current round |
| `currentMap` | text | ❌ | Current map name |
| `server.ip` | text | ✅ | Server IP |
| `server.port` | number | ✅ | Server port |
| `server.name` | text | ❌ | Server name |
| `players` | array | ✅ | Race players |
| `players.user` | relationship | ✅ | Player user |
| `players.ingameNick` | text | ✅ | In-game nickname |
| `players.roundsWon` | number | ❌ | Rounds won |
| `players.isReady` | checkbox | ❌ | Ready status |
| `rounds` | array | ❌ | Round history |
| `rounds.roundNumber` | number | ✅ | Round number |
| `rounds.mapName` | text | ✅ | Map played |
| `rounds.winner` | relationship | ❌ | Round winner |
| `rounds.finishTime` | number | ❌ | Finish time (seconds) |
| `winner` | relationship | ❌ | Race winner |
| `status` | select | ✅ | waiting, ready, in_progress, completed, cancelled |
| `botId` | text | ❌ | Monitoring bot container ID |
| `createdBy` | relationship | ✅ | Creator |
| `startedAt` | date | ❌ | Start time |
| `completedAt` | date | ❌ | End time |

---

## Bots

**Slug:** `bots`
**Group:** System

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Bot name |
| `containerId` | text | ✅ | Docker container ID |
| `mode` | select | ✅ | verification, race, chat, monitor |
| `status` | select | ✅ | starting, running, stopping, stopped, error |
| `connectedServer.ip` | text | ❌ | Connected server IP |
| `connectedServer.port` | number | ❌ | Connected server port |
| `linkedGame` | relationship | ❌ | Linked bingo or race |
| `linkedUser` | relationship | ❌ | Linked user |
| `logs` | array | ❌ | Bot logs |
| `logs.timestamp` | date | ✅ | Log timestamp |
| `logs.level` | select | ❌ | info, warn, error |
| `logs.message` | text | ✅ | Log message |
| `startedAt` | date | ❌ | Start time |
| `stoppedAt` | date | ❌ | Stop time |
| `metadata` | json | ❌ | Additional data |

---

## Notifications

**Slug:** `notifications`
**Group:** System

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipient` | relationship | ✅ | Target user |
| `type` | select | ✅ | game_invite, friend_request, game_started, game_ended, achievement, system |
| `title` | text | ✅ | Notification title |
| `message` | text | ✅ | Notification message |
| `isRead` | checkbox | ❌ | Read status |
| `actionUrl` | text | ❌ | Click action URL |
| `relatedGame` | relationship | ❌ | Related bingo or race |
| `relatedUser` | relationship | ❌ | Related user |
| `metadata` | json | ❌ | Additional data |

---

## FriendRequests

**Slug:** `friend-requests`
**Group:** Social

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sender` | relationship | ✅ | Request sender |
| `recipient` | relationship | ✅ | Request recipient |
| `status` | select | ✅ | pending, accepted, rejected |
| `message` | text | ❌ | Optional message |

---

## ChatSessions

**Slug:** `chat-sessions`
**Group:** Social

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `initiator` | relationship | ✅ | Chat initiator |
| `target` | relationship | ✅ | Chat target |
| `targetNickname` | text | ✅ | Target in-game nick |
| `status` | select | ✅ | connecting, active, disconnected, error |
| `server.ip` | text | ❌ | Server IP |
| `server.port` | number | ❌ | Server port |
| `botContainerId` | text | ❌ | Bot container ID |
| `startedAt` | date | ❌ | Start time |
| `endedAt` | date | ❌ | End time |

---

## VerificationRequests

**Slug:** `verification-requests`
**Group:** Verification

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nickname` | text | ✅ | Nickname to verify |
| `token` | text | ✅ | 6-digit token |
| `status` | select | ✅ | pending, active, success, expired, failed |
| `currentServer` | text | ❌ | Found on server |
| `containerId` | text | ❌ | Bot container ID |
| `user` | relationship | ✅ | Requesting user |
| `expiresAt` | date | ✅ | Expiration time |

---

## Servers

**Slug:** `servers`
**Group:** Verification

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Server name |
| `ip` | text | ✅ | Server IP |
| `port` | number | ✅ | Server port (default: 8303) |
| `isActive` | checkbox | ✅ | Active for verification |
| `region` | text | ❌ | Server region |

---

## Media

**Slug:** `media`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alt` | text | ❌ | Alt text |

*Upload enabled, stored in Cloudinary*

---

## Support

**Slug:** `support`
**Group:** Support

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | text | ✅ | Ticket subject |
| `description` | richText | ✅ | Issue description |
| `category` | select | ✅ | name_change, bug_report, etc. |
| `priority` | select | ✅ | low, medium, high, critical |
| `status` | select | ✅ | open, in_progress, resolved, closed |
| `createdBy` | relationship | ✅ | Creator user |
| `responses` | array | ❌ | Staff responses |
| `attachments` | upload | ❌ | File attachments |
| `resolvedAt` | date | ❌ | Resolution time |

---

## Articles

**Slug:** `articles`
**Group:** Content

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | text | ✅ | Article title |
| `slug` | text | ✅ | URL slug |
| `excerpt` | text | ❌ | Short description |
| `content` | richText | ✅ | Article content |
| `coverImage` | upload | ❌ | Cover image |
| `author` | relationship | ✅ | Author user |
| `category` | select | ✅ | news, tutorial, guide, etc. |
| `tags` | array | ❌ | Tags |
| `featured` | checkbox | ❌ | Featured article |
| `views` | number | ❌ | View count |
| `likes` | number | ❌ | Like count |

---

## ForumPosts

**Slug:** `forum-posts`
**Group:** Community

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | text | ✅ | Post title |
| `slug` | text | ✅ | URL slug |
| `content` | richText | ✅ | Post content |
| `author` | relationship | ✅ | Author user |
| `category` | select | ✅ | general, help, suggestions, etc. |
| `tags` | array | ❌ | Tags |
| `status` | select | ✅ | published, hidden, locked |
| `isPinned` | checkbox | ❌ | Pinned post |
| `views` | number | ❌ | View count |
| `likes` | number | ❌ | Like count |
| `replies` | array | ❌ | Post replies |
