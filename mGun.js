const
mGun = function(opts = {}) {
    if(mGun['$']) {
        console.log("Singleton! Return the hidden instance...")
        return mGun['$']
    }
    const
    mGunSEA = mSEA,
    dateNow = Date.now,
    Gun = class{},
    User = class{},
    Contact = class{},
    apiFeaturesBaseGun = [ 'get', 'put', 'set', 'map', 'on', 'off', 'once' ],
    protectedGunProperties = ['#', '>'],
    privateGunProperties = ['!', '$', '?'],
    specialGunProperties = [...protectedGunProperties, ...privateGunProperties],
    // options
    GunPathDelimiter = opts.delimiter || '.',
    globalRoot = opts.root || '~global',
    generateSoul = opts.genSoul ? opts.genSoul : () => '#' + crypto.randomUUID(),
    xTfilter = opts.xTfilter ? opts.xTfilter : (queue, topic) => queue.filter(task => {
        //console.log("FILTER Wildcard", topic, task.topic)
        if(task.topic == topic || (task.topic.endsWith('*') && topic.startsWith(task.topic.slice(0, -1)))) {
            return true
        } else {
            return false
        }
    }),
    // pub sub task instance
    xTmGun = new xT('mGun', { filter: xTfilter }),

    createGunItem = function(inputObject, features = apiFeaturesBaseGun, baseObject = new Gun()) {
        let 
        targetObject = Object.assign(
            baseObject, 
            { 
                ['#']: {}, 
                //['>']: {}, 
                //['!']: {}, 
                ['?']: features
            }, 
            inputObject 
        ),
        gunObjHandler = {
            set(target, property, value) {
                //checkIfProtectedGunProperties(property)
                if(specialGunProperties.includes(property)) {
                    return 
                }
                target[property] = value
                target['>'][property] = dateNow()
                //console.log("UPDATE", property, value, target, this) 
            },
            deleteProperty(target, property) {
                //checkIfProtectedGunProperties(property)
                if(specialGunProperties.includes(property)) {
                    return 
                }
                //console.log("DELETE", property, target[property], target)
                delete target[property]
                target['>'][property] = dateNow()
            },
            get(target, property) {
                //console.log("GET", property, target)
                if(privateGunProperties.includes(property)) {
                    return 
                } else if(protectedGunProperties.includes(property)) {
                    return (prop) => target[property][prop] || -1
                } else if(target['?'].includes(property)) {
                    return (...args) => xTmGun.emit(target, property, ...args)
                } 
                return target[property]
            },
            ownKeys(target) {
                // filter out special properties
                return Reflect.ownKeys(target).filter(key => !specialGunProperties.includes(key))
            }
        },
        mGunObjectProxy = new Proxy(targetObject, gunObjHandler)
        // trigger timestamp if unset
        for (prop in mGunObjectProxy) {
            if(mGunObjectProxy['>'](prop) < 0) {
                mGunObjectProxy[prop] = mGunObjectProxy[prop]   
            }
        }
        return mGunObjectProxy
    },

    mGunAPI = {
        // Storage adapter
        load: function(...args) {
            // get as array of (single) property OR property => value pairs
            console.log(arguments.callee.name, args, this['#'], this)
        },
        save: function(...args) {
            // object -> save as property => value 
            // primitive -> save as key => value
            console.log(arguments.callee.name, args, this['#'], this)
        },
        merge: function(...args) {
            console.log(arguments.callee.name, args, this['#'], this)
            // merge two mGun Nodes by timestamps...
        },
        // mGun base API features
        /**
         * @todo single node vs nodelist ?
         * @todo features based on path object?
         */
        get: function(path) {
            console.log(arguments.callee.name, path, this['#'], this)
            path = this['#'].path + GunPathDelimiter + path
            return createGunItem( { ['#']: { path: path }, ['>']: {} } )
        },
        put: function(value) {
            console.log(arguments.callee.name, value, this['#'], this)
        },
        set: function(item) {
            console.log(arguments.callee.name, item, this['#'], this)
        },
        map: function(callback) {
            console.log(arguments.callee.name, callback, this['#'], this)
        },
        once: function(callback) {
            console.log(arguments.callee.name, callback, this['#'],this)
        },
        /**
         * @todo single node vs nodelist ?
         */
        on: function(callback) {
            console.log(arguments.callee.name, callback, this['#'],this)
        },
        off: function() {
            console.log(arguments.callee.name, this['#'], this)
        },
        // mSEA API features
        user: async function(alias, restorePair) {
            let 
            bornTime = dateNow(),
            pair = restorePair ? await mGunSEA.restore(restorePair) : await mGunSEA.pair(),
            pub = await mGunSEA.exportKey(pair.pub),
            epub = await mGunSEA.exportKey(pair.epub)
            /**
             * @todo get public params and borntime from storage / remote
             */
            // set alias...
            alias = alias ? alias : pub
            return createGunItem(
                {
                    ['#']: { soul: '~' + pub, path: '~' + pub },
                    ['>']: { pub: bornTime, epub: bornTime, alias: bornTime },
                    ['!']: pair,
                    pub: pub,
                    epub: epub,
                    alias: alias
                },
                [ /*...apiFeaturesBaseGun*/'get', 'encrypt', 'decrypt', 'sign', 'verify', 'export', 'contact' ],
                new User()  // base object / type
            )
        },
        sign: async function(data) {
            return await mGunSEA.sign(data, this['!'].priv)
        },
        verify: async function(data, signature, foreignPub = this['!'].pub) {
            if(foreignPub instanceof CryptoKey == false) {
                foreignPub = await mGunSEA.importKey(foreignPub)
            }
            return await mGunSEA.verify(data, signature, foreignPub)
        },
        /**
         * @todo 1:n group encryption ? 
         */
        encrypt: async function(data, foreignPub = this['!'].epub) {
            if(foreignPub instanceof CryptoKey == false) {
                foreignPub = await mGunSEA.importKey(foreignPub, 'epub')
            }
            return await mGunSEA.encrypt(data, await mGunSEA.secret(foreignPub, this['!'].epriv))
        },
        decrypt: async function(encData, foreignPub = this['!'].epub) {
            if(foreignPub instanceof CryptoKey == false) {
                foreignPub = await mGunSEA.importKey(foreignPub, 'epub')
            }
            let secret = await mGunSEA.secret(foreignPub, this['!'].epriv)
            return await mGunSEA.decrypt(encData, secret)
        },
        export: async function() {
            return await mGunSEA.backup(this['!'])
        },
        contact: async function(pubPair) {  // pub, epub, alias?
            // create a object referenced to current user and the foreign "contact" (epub, pub, graph root node, alias) user
            // 
            return createGunItem(
                {
                    ['#']: { path: '~' + pubPair.pub, soul: '~' + pubPair.pub }, // contacts pub, epub, alias, -> node ?
                    ['!']: { 
                        pub: await mGunSEA.importKey(pubPair.pub), epub: await mGunSEA.importKey(pubPair.epub, 'epub'), // foreign contact values
                        priv: this['!'].priv, epriv: this['!'].epriv                                                    // user priv self
                    }, 
                }, 
                [ 'get', 'sign', 'verify', 'encrypt', 'decrypt' ], 
                new Contact () 
            )
        }
    }

    // initial run one-time populate API tasks
    Object.entries(mGunAPI).forEach(([feature, action]) => xTmGun.on(feature, action))

    // one-time initalization finished, return mGun root object
    /**
     * @todo base features without path based like on, once, put, set... ?
     */
    return mGun['$'] = createGunItem( {['#']: { path: globalRoot, soul: globalRoot } }, [ /*...apiFeaturesBaseGun*/'get', 'user' ] )
}
