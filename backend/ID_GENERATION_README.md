# Backend ID Generation Architecture & Documentation

This document explains the backend ID generation system implemented in the Vignan Mahotsav platform (`backend/utils/idGenerator.js`).

---

## 📌 Overview

The backend uses a **thread-safe, concurrency-controlled sequential ID generator** with MongoDB to generate unique IDs for users, event registrations, teams, and Campus Ambassadors.

It guarantees:
1. **Uniqueness**: Prevents race conditions and duplicate ID creation under concurrent HTTP requests.
2. **Standardized Formatting**: Prefix-based custom formats with fixed-width zero padding.
3. **High Performance & Safety**: Combines in-memory promise queues, MongoDB atomic increments (`$inc`), and fallback retries.

---

## 🆔 ID Formats & Structures

| ID Type | Prefix | Format Pattern | Example | Purpose / Scope |
| :--- | :--- | :--- | :--- | :--- |
| **User ID** (`userId`) | `MH26` | `MH26` + 6 digits | `MH26000001` | Unique primary key for participant/visitor accounts |
| **Sports Individual Reg ID** | `SR` | `SR` + 8 digits | `SR26000001` | Individual Sports Event registration |
| **Cultural Individual Reg ID**| `CR` | `CR` + 8 digits | `CR26000001` | Individual Cultural Event registration |
| **Other Event Reg ID** | `ER` | `ER` + 8 digits | `ER26000001` | General Event registration |
| **Sports Team ID** | `ST` | `ST` + 8 digits | `ST26000001` | Sports Team registration identifier |
| **Cultural Team ID** | `CT` | `CT` + 8 digits | `CT26000001` | Cultural Team registration identifier |
| **General Event Team ID** | `ET` | `ET` + 8 digits | `ET26000001` | General Event Team identifier |
| **Campus Ambassador ID** (`mcaId`) | `MCA` | `MCA` + 6 digits | `MCA260001` | Unique referral identifier for Campus Ambassadors |

---

## 🛠️ Architecture & Core Components

```
+-----------------------------------------------------------------------------------+
|                                 HTTP Post Request                                 |
+-----------------------------------------------------------------------------------+     AI
                                          |
                                          v
+-----------------------------------------------------------------------------------+    
|                        In-Memory Queue (IdGenerationQueue)                        |
|   Serializes parallel requests to prevent NodeJS event-loop race conditions       |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                      MongoDB Atomic Counter ($inc) / Query                        |
|   Finds & increments dedicated counter or fetches latest created document          |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        Formatted ID String Generation                             |
|   Prefix + Year Identifier + Zero-Padded Sequential Number                        |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                            Save Document to Database                              |
|   (If MongoDB duplicate code 11000 occurs, auto-retry up to 3 times)             |
+-----------------------------------------------------------------------------------+
```

---

## 🔍 Detailed Component Analysis

### 1. In-Memory Request Queue (`IdGenerationQueue`)

In a multi-user environment, two registration requests arriving at the exact same millisecond can trigger race conditions if reading max values from the database simultaneously.

To solve this, `backend/utils/idGenerator.js` defines `IdGenerationQueue`:

```javascript
class IdGenerationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async enqueue(generatorFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({ generatorFunction, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const { generatorFunction, resolve, reject } = this.queue.shift();
      try {
        const result = await generatorFunction();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    this.processing = false;
  }
}
```

* **Separate Queues**:
  - `userIdQueue`: Handles user registration ID tasks.
  - `registrationIdQueue`: Handles individual event registration tasks.
  - `teamIdQueue`: Handles team event registration tasks.

---

### 2. User ID Generation (`generateUserId`)

User IDs are generated using an **Atomic Counter Pattern** via MongoDB's `findOneAndUpdate`:

```javascript
// Counter Schema in MongoDB ('counters' collection)
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. 'userId'
  seq: { type: Number, default: 0 }
});

async function generateUserId() {
  return userIdQueue.enqueue(async () => {
    // Atomically increment counter
    const counter = await Counter.findOneAndUpdate(
      { _id: 'userId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const nextNumber = counter.seq;
    return `MH26${nextNumber.toString().padStart(6, '0')}`;
  });
}
```

#### Highlights:
* **`$inc: { seq: 1 }`**: Executed natively inside MongoDB engine atomically.
* **`upsert: true`**: Creates the `userId` counter document if it doesn't exist yet.
* **`padStart(6, '0')`**: Ensures fixed 6-digit width (e.g. `1` -> `000001`, `150` -> `0000150`).

---

### 3. Event & Team ID Generation (`generateRegistrationId` / `generateTeamId`)

For individual and team event registrations, the generator checks the `EventRegistration` collection sorted by creation timestamp (`createdAt: -1`).

```javascript
async function generateRegistrationId(eventType) {
  return registrationIdQueue.enqueue(async () => {
    const prefix = eventType === 'sports' ? 'SR' : eventType === 'culturals' ? 'CR' : 'ER';
    const lastRegistration = await EventRegistration.findOne({ registrationType: 'individual' })
      .sort({ createdAt: -1 })
      .select('registrationId');
    
    if (!lastRegistration || !lastRegistration.registrationId) {
      return `${prefix}26000001`;
    }
    
    const lastNumber = parseInt(lastRegistration.registrationId.substring(2));
    const nextNumber = lastNumber + 1;
    return `${prefix}${nextNumber.toString().padStart(8, '0')}`;
  });
}
```

---

### 4. Campus Ambassador ID Generation (`generateMCAId`)

Located in `backend/routes/campusAmbassador.js`:

```javascript
const generateMCAId = async () => {
  const lastCA = await CampusAmbassador.findOne({}, { mcaId: 1 }).sort({ mcaId: -1 }).limit(1);

  if (!lastCA) {
    return 'MCA260001';
  }

  const lastNumber = parseInt(lastCA.mcaId.substring(3));
  const nextNumber = lastNumber + 1;
  return `MCA${nextNumber.toString().padStart(6, '0')}`;
};
```

---

### 5. Retry & Resilience Mechanism

In `backend/routes/registration.js`, registration endpoint incorporates a `MAX_RETRIES = 3` loop:

```javascript
const MAX_RETRIES = 3;
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    const userId = await generateUserId();
    // ... save registration to MongoDB ...
    await newRegistration.save();
    break; // Success
  } catch (error) {
    if (error.code === 11000 && attempt < MAX_RETRIES) {
      console.warn(`Duplicate userId collision on attempt ${attempt}, retrying...`);
      continue;
    }
    throw error;
  }
}
```

---

## 📁 Related Source Files

- **[idGenerator.js](file:///c:/Users/banda/Desktop/my%20files/mine/backend/utils/idGenerator.js)**: Core queue and ID generator utility logic.
- **[registration.js](file:///c:/Users/banda/Desktop/my%20files/mine/backend/routes/registration.js)**: Registration route handler calling `generateUserId()`.
- **[campusAmbassador.js](file:///c:/Users/banda/Desktop/my%20files/mine/backend/routes/campusAmbassador.js)**: Campus Ambassador signup handler calling `generateMCAId()`.
- **[Registration.js](file:///c:/Users/banda/Desktop/my%20files/mine/backend/models/Registration.js)**: Mongoose model definition with unique indexes on `userId`.
- **[EventRegistration.js](file:///c:/Users/banda/Desktop/my%20files/mine/backend/models/EventRegistration.js)**: Mongoose model storing `registrationId` & `teamId`.
