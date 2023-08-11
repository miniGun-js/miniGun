const
miniGun = () => {
    const
    SEAlite = SEA(),
    taskMgr = new xT('miniGun'),
    generateSoul = () => '#' + crypto.randomUUID(),
    globalGraphRoot = '~global',
    pathDelimiter = '.',
    miniGunHandler = {
        get(target, prop) {
            // Method which is not a getter is called
            if (target[prop] && target[prop].call && !Object.getOwnPropertyDescriptor(target, prop)['get']) {
                return (...args) => target[prop].call(target, ...args)
            } else if(target[prop]) {   // simple target property
                return target[prop]
            } else {
                // map to api task emit
                return (...args) => taskMgr.emit(target, prop, ...args)
            }
        }
    },
    pathToArray = (...path) => {
        return path.map(part => {
            if(typeof part == 'string') {
                return part.split(pathDelimiter)
            } else {
                return part
            }
        }).flat()
    },
    handleGunNode = (soul, node = {}, createIfNotExists = true) => {
        let resultNode
        if(!node && soul) {
            // retrieve node by soul
            resultNode = taskMgr.emit('load', soul)
            if(resultNode) {
                createIfNotExists = false
            } else {
                resultNode = { ['#']: { soul: soul } }
            }
        } else if(node && soul) {
            // retrieve and merge existing node
            resultNode = taskMgr.emit('load', soul) 
            if(!resultNode) {
                resultNode = { ['#']: { soul: soul } }
            }
            Object.assign(resultNode, node)
        } 
        resultNode = new Gun(resultNode)
        if(createIfNotExists) {
            // save (merged / changed) node
            if(!resultNode.soul()) {
                resultNode['#'].soul = generateSoul()
            }
            taskMgr.emit('store', resultNode.soul(), resultNode)
        }
        return resultNode
    },
    graphology = function(gunPath) {
        let
        // Initial need graph root path...
        endOfPathKey = gunPath.slice(-1),
        rootSoul = gunPath[0],
        currentPath = [rootSoul],
        // get and optionally create graph root node...
        //console.log("DEUG", path[0])
        currentNode = handleGunNode(rootSoul)
        console.log("graphology::ROOT", currentPath, gunPath, currentNode)
        // handle all sub path parts...
        gunPath.slice(1).forEach(key => {
            currentPath.push(key)
            //console.log("graphology", key, currentPath, path)
            if(key == endOfPathKey) {
                return currentNode
            } else if(currentNode[key] && currentNode[key][0] == '#') {
                currentNode = handleGunNode(currentNode[key])
            } else {
                let newNode = handleGunNode()
                console.log("CREATE", newNode)
                currentNode[key] = newNode.soul()
                handleGunNode(currentNode.soul(), currentNode)
                //console.log('DEBUG', currentNode, newNode)
                currentNode = newNode
            }
        })
        return currentNode
    },
    //miniGUN API features
    gunApiFeatures = {
        // Extend miniGun API features
        fn: (apiFeatureExtensions = {}) => {
            Object.entries(apiFeatureExtensions).forEach(([feature, action]) => {
                taskMgr.on(feature, action)
            })
        },
        load: (key) => {
            console.log("miniGun::load - retrieve node from graph", key)
            return JSON.parse(localStorage.getItem(key))
        },
        store: (key, value) => {
            console.log("miniGun::store - save node from graph", key, value)
            localStorage.setItem(key, JSON.stringify(value))
        },
        // Gun API
        get: function(path) {
            let 
            newPath = pathToArray(this.path(), path),
            newObject = new Proxy(new Gun({}, newPath), miniGunHandler)
            console.log("Gun::GET", `InputPath="${path}"`, `NewPath="${newPath.join(pathDelimiter)}"`, "returnObject:", newObject, "thisArg", this)
            return newObject
        },
        put: function(value) {
            let 
            key = this.path().slice(-1),
            node = graphology(this.path())
            node[key] = value
            handleGunNode(node.soul(), node)
            console.log("Gun::PUT", `Path="${path}"`, key, value, "returnObject:", node, "thisArg", this)
            return node
        },
        set: function(obj) {
            console.log("Gun::SET", obj, this)
        },
        map: function(callback) {
            console.log("Gun::MAP", callback, this)
        },
        on: function(callback) {
            console.log("Gun::ON", callback, this)
        },
        once: function(callback) {
            console.log("Gun::ONCE", callback, this)
        },
        off: function(callback) {
            console.log("Gun::OFF", callback, this)
        },
        // SEA API
        pair: async (alias ) => {
            let keyPair = await SEAlite.pair()
            keyPair.soul = '~' + await SEAlite.exportKey(keyPair.pub)
            keyPair.alias = alias ? alias : keyPair.soul
            return keyPair
        },
        user: (pair) => new Proxy(new User(pair), miniGunHandler),
        sign: async function(data) {
            return await SEAlite.sign(data, this['#'].priv)
        },
        verify: async function(data, signature, foreignPub = this['#'].pub) {
            return await SEAlite.verify(data, signature, foreignPub)
        },
        encrypt: async function(data, foreignPub = this['#'].epub) {
            return await SEAlite.encrypt(data, await SEAlite.secret(foreignPub, this['#'].epriv))
        },
        decrypt: async function(encData, foreignPub = this['#'].epub) {
            return await SEAlite.decrypt(encData, await SEAlite.secret(foreignPub, this['#'].epriv))
        }
    }

    Gun = class {
        ['#'] = {} 
        
        #path = []

        #features = [ 'get', 'put', 'set', 'map', 'on', 'off', 'once' ]

        constructor(nodeObj, path = [], features = []) {
            this.#path = path
            Object.assign(this, { ...nodeObj }) // public node object
            this.#features.push(...features)
        }

        soul() {
            return this['#'].soul
        }

        path() {
            return this.#path
        }
    }

    User = class extends Gun {
        constructor(userPair, features = ['encrypt', 'decrypt', 'sign', 'verify']) {
            let 
            preparePublicKeys = async () => {
                this.pub = await SEAlite.exportKey(this['#'].pub)
                this.epub = await SEAlite.exportKey(this['#'].epub)
            },
            // prepare users gun node
            userNode = {} //{ ...miniGunReadOrCreateNode(userPair.soul, false) }
            userNode['#'] = { ...userPair }
            // create node and initialize parent class
            super(userNode, [userPair.soul], features)
            // export pub / epub keys
            preparePublicKeys()
        }

        alias() {
            return this['#'].alias
        }
    }

    // add api features as xT tasks
    gunApiFeatures.fn(gunApiFeatures)
    
    return new Proxy(new Gun({}, [globalGraphRoot], ['pair', 'user', 'fn']), miniGunHandler)
}
