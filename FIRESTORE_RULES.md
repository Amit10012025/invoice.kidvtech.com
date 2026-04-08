# Firestore Security Rules — KIDV Invoice

## Firebase Console ma Rules update karo:
1. https://console.firebase.google.com
2. KIDV Tech project → Firestore Database → **Rules** tab
3. Niche deli rules paste karo → **Publish** click karo

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      // User apano doc read/write kari shake
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // User ni subcollections (clients, invoices, products, etc.)
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Admin (amit@kidvtech.com) badha users read kari shake
    match /users/{userId} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;

      match /{subcollection}/{docId} {
        allow read: if request.auth != null &&
          exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      }
    }
  }
}
```

## Important:
- Rules update karyaa pachhi **5-10 second** wait karo
- Browser ma hard refresh karo (Ctrl+Shift+R)
