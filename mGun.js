const
mGun = () => {
    if(mGun['$']) {
        return mGun['$']()
    }
    const
    // mSEA Crypto implementation
    _SEA = mGun.SEA = mSEA,
    // path of User Root Node
    rootStore = 'global',
    rootPath = '~',
    // path delimiter
    delimiter = '.', 
    // UUID generator
    //generateSoul = () => '#' + crypto.randomUUID(),
    // pub sub task instance
    xTfilter = (queue, topic) => queue.filter(task => {
        //console.log("FILTER Wildcard", topic, task.topic)
        if(task.topic == topic || (task.topic.endsWith('*') && topic.startsWith(task.topic.slice(0, -1)))) {
            return true
        } else {
            return false
        }
    }),
    _xT = mGun.xT = new xT('mGun', { filter: xTfilter }),

    storeSchema = { keyPath: ['path', 'key'] },
    storeIndexes = [
        [ 'path', 'path', {} ],
        [ 'time', 'time', {} ]
    ],
    _DB = IDB2('mGun'),

    prxHander = {
        get: (target, property) => {
            if(property == '>') {
                return (prop) => target[prop] ? target[prop].time : -1
            } else if(target['?'].includes(property)) {
                return (...args) => _xT.emit(target, property, ...args)
            }
            return target[property] ? target[property].val : undefined
        },
        set: (target, property, value) => {
            if(!target['!'] || (target[property] && target[property].ro)) throw new Error("READONLY")   // not logged in OR ReadOnly property
            if(!target[property] || (target[property] && target[property].val != value)) {
                console.log("CHANGE", property, target[property]?.val, value, target[property]?.time)
                target[property] = {
                    key: property,
                    val: value,
                    time: Date.now()
                }
                target['>'].add(property)
            }
        },
        deleteProperty(target, property) {
            if(!target['!'] || (target[property] && target[property].ro)) throw new Error("READONLY")
            console.log("DELETE", property, target[property].time)
            target[property] = {
                val: null,
                time: Date.now()
            }
            target['>'].add(property)
        },
        ownKeys: (target) => {
            return Reflect.ownKeys(target).filter(key => !['!', '>', '?', '#'].includes(key) && target[key].val != null)
        }
    },

    createProxy = (obj) => {
        return new Proxy(obj, prxHander)
    },

    apiFeatures = {
        // storage
        load: async function(table, path) {
            console.log(arguments.callee.name, table, path, this)
            let 
            store = _DB(table, storeSchema, storeIndexes),
            result = await store.get(path, 'path')
            for(item of result) {
                let 
                sig = item.sig
                pub = await _SEA.importKey(item.pub)
                delete(item.sig)
                if(await _SEA.verify(JSON.stringify(item), sig, pub)) {
                    console.log('LOAD', "Signatures matching")
                } else {
                    throw new Error('LOAD', "Signature mismatch!", item, sig, pub)
                }
            }
            return result
        },
        save: async function() {
            let
            store = _DB(this['#'], storeSchema, storeIndexes),
            //parts = Reflect.ownKeys(this).map(key => !['!', '>', '?', '#'].includes(key) ? this[key] : null).filter(notEmpty => notEmpty)
            parts = [...this['>']].map(key => this[key])
            for(item of parts) {
                item.path = this['~']
                item.pub = this['§'].pub
                item.sig = await _SEA.sign(JSON.stringify(item), this['!'].priv, this['!'].pub)
            }
            this['>'] = new Set()
            if(parts.length > 0) {
                store.set(parts)
            } else {
                console.log("SAVE::SKIP", "No changes!")
            }
        },
        sync: function() {
            console.log(arguments.callee.name, this)
        },
        // base 
        get: async function(path) {
            if(path[0] != rootPath) {
                path = this['~'] + delimiter + path
            }
            let 
            res = await _xT.emit(this, 'load', this['#'], path),
            node = {
                '#': this['#'],
                '~': path,
                '!': this['!'],
                '§': this['§'],
                '>': new Set(),
                '?': [ 'put', 'map', 'on', 'off', 'save' ]
            }
            res.forEach(prop => node[prop.key] = prop)
            console.log(arguments.callee.name, this['#'], path, res, node, this)
            return createProxy(node)
        },
        put: function() {
            console.log(arguments.callee.name, this)
        },
        map: function() {
            console.log(arguments.callee.name, this)
        },
        on: function() {
            console.log(arguments.callee.name, this)
        },
        off: function() {
            console.log(arguments.callee.name, this)
        },
        // user
        /**
         * @todo alias optional (existing user gets alias from DB)
         */
        user: async function(restorePair, initialAlias) {
            let 
            bornTime = Date.now(),
            pair = restorePair ? await _SEA.restore(restorePair) : await _SEA.pair(),
            pub = await _SEA.exportKey(pair.pub),
            epub = await _SEA.exportKey(pair.epub, 'epub'),
            existingUser = res = await _xT.emit(this, 'load', pub, rootPath)
            if(existingUser.length < 1) {
                existingUser = {
                    pub: { key: 'pub', val: pub, time: bornTime, ro: 1 },
                    epub: { key: 'epub', val: epub, time: bornTime, ro: 1 },
                    alias: { key: 'alias', val: initialAlias ? initialAlias : pub, pub, time: bornTime },
                    '>': new Set(['pub', 'epub', 'alias'])
                }
            } else {
                let node = {}
                existingUser.forEach(prop => node[prop.key] = prop)
                node['>'] = new Set()
                existingUser = node
            }
            // auth session...
            this['!'] = pair
            this['§'] = { pub: pub, epub: epub }
            /**
             * @todo remove testing save / load 
             */
            this['?'] = [ 'get', 'encrypt', 'decrypt', 'sign', 'verify', 'export', 'contact', 'save', 'load' ]
            // create user 
            return createProxy({ 
                ...existingUser,
                '?': this['?'],
                '#': pub,
                '~': rootPath,
                '!': this['!'],
                '§': this['§']
            })
        },
        sign: async function(data) {
            return await _SEA.sign(data, this['!'].priv)
        },
        verify: async function(data, signature, foreignPub = this['!'].pub) {
            if(foreignPub instanceof CryptoKey == false) {
                foreignPub = await _SEA.importKey(foreignPub)
            }
            return await _SEA.verify(data, signature, foreignPub)
        },
        encrypt: async function(data, foreignPub = this['!'].epub) {
            if(foreignPub instanceof CryptoKey == false) {
                foreignPub = await _SEA.importKey(foreignPub, 'epub')
            }
            return await _SEA.encrypt(data, await _SEA.secret(foreignPub, this['!'].epriv))
        },
        decrypt: async function(encData, foreignPub = this['!'].epub) {
            if(foreignPub instanceof CryptoKey == false) {
                foreignPub = await _SEA.importKey(foreignPub, 'epub')
            }
            let secret = await _SEA.secret(foreignPub, this['!'].epriv)
            return await _SEA.decrypt(encData, secret)
        },
        export: async function() {
            return await _SEA.backup(this['!'])
        },
        contact: async function(pubPair) {  // pub, epub, alias?
        }
    }

    // initial run one-time populate API tasks
    Object.entries(apiFeatures).forEach(([feature, action]) => _xT.on(feature, action))

    // initialization finished...
    mGun['$'] = () => createProxy( { 
        '#': rootStore,         // DB table
        '~': rootPath,          // item path
        '>': new Set(),         // changed property tracker
        '?': [ 'user', 'get' ]  // features
        //'!': {}               // logged in users CryptoKey pair
        //'§': { pub, epub }    // exported logged in users pub and epub
    })

    // expose base object
    return mGun['$']()
}
