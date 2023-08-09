# miniGun

A GunDB and SEA inspired minimal library

**A PoC for testing purposes only!**

# Usage

Executed in browser console

Global graph
```
// Move internal path pointer
Gun.get("app.cfg.name")
n1 = Gun.get("app.cfg.name")

// Use path and set / replace a value
n1.put("BUM!")

// Return value only at the moment
n1.once(console.log)
```

User graph
```
// create user key pair
pair = await Gun.pair()

// User object with API features
user1 = Gun,user(pair, "Username")

// Gun API as with global path
usert1.get(...)

// test data für crypt & sign
msg = "A simple text..."

// self encrypt & decrypt
enc = await user1.encrypt(msg)
await user1.decrypt(enc)

// self sign &  verify
sig = await user1.sign(msg)
await user1.verify("data", sig)
```

# ToDo
- Handle data merging ?
- Gun API features (set, map, on, once, off)
- Storage Adapter (localStorage with files, indexeddb?)
- Remote sync, maybe easypeers based ??
