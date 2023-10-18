# mGun

A GunDB and SEA inspired minimal library

**A PoC for testing purposes only!**

# Usage

Create pairs / users with sign, verify, encrypt and decrypt ist working, but no content and graph features at the moment...
Executed in browser console.
```
// mGun instance
g = mGun();

// create users
u1 = await g.user("User1");
u2 = await g.user("User2");

// export user, restore as mSEA pair and restore as user
bkp = await u1.export();
pair = await mSEA.restore(bkp);
restored_user = await g.user("restored user", bkp);

// sign & verify
text = "Just a text...";
sig = await u1.sign(text);
verified = await u2.verify(text, sig, u1.pub);
console.log("SIGN & VERIFY", text, sig, `signature match=${verified}`);

// encrypt & decrypt
encSelf = await u1.encrypt(text);
decSelf = await u1.decrypt(encSelf); // self crypt
console.log("CRYPT SELF", text, encSelf, decSelf);

// encrypt & decrypt 1:1
enc = await u1.encrypt(text, u2.epub);
dec = await u2.decrypt(enc, u1.epub); // self crypt
console.log("CRYPT 1:1", text, enc, dec);

// contact user referenced with a foreign e/pub part
c1 = await u2.contact({ pub: u1.pub, epub: u1.epub }); // c1 is the helper for user2 to communicate with user1
c2 = await u1.contact({ pub: u2.pub, epub: u2.epub }); // c2 is the helper for user1 to communicate with user2

// contact verify foreign user signed data
sigContact = await u2.sign(text);
sigContact2 = await c1.sign(text);

verifiedContact = await c2.verify(text, sigContact);
verifiedContact2 = await c2.verify(text, sigContact2);
console.log("CONTACT SIGNED", `match=${verifiedContact}`);
console.log("CONTACT SIGNED", `match=${verifiedContact2}`);

// decrypt foreign user encrypted data 
contactEnc = await c2.encrypt(text, u2.epub);
contactDec = await c2.decrypt(contactEnc);
console.log("CONTACT CRYPT 1:1", text, contactEnc, contactDec);

// mGun "get"
n1 = g.get("path").get("to").get("node");
console.log('mGun GET return', n1);
n2 = g.get("path.to.node"); // same path as n1
console.log('mGun GET return', n2);
```

# ToDo / not implemented
- Storage Adapter and schema
- Gun API features (put, set, map, on, once, off)
- Remote sync
