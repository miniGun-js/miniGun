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
    handleGunNode = (soul, node = {}, path = [], createIfNotExists = true) => {
        //console.log("handleGunNode", soul, path, node, createIfNotExists)
        let resultNode = {['#']: {}}
        if(!soul && (node['#'] && node['#'].soul)) {
            soul = node['#'].soul
        }
        if(soul) {
            resultNode = taskMgr.emit('load', soul)
            console.log("DIFF?", resultNode, node)
        } 
        if(!resultNode) {
            resultNode = { ['#']: { soul: soul}}
        }
        // merge existing / base and given node param object
        resultNode = new Gun(
            Object.assign(resultNode, node), 
            path
        ) 
        if(createIfNotExists) {
            if(!resultNode.soul()) {
                resultNode['#'].soul = generateSoul()
            }
            taskMgr.emit('store', resultNode.soul(), resultNode)
        }
        return resultNode
    },
    graphology = function(gunPath, createIfNotExists = true) {
        let
        // Initial need graph root path...
        endOfPathKey = gunPath.slice(-1)[0],
        secondLastPathKey = gunPath.slice(-2, -1)[0],
        rootSoul = gunPath[0],
        currentPath = [rootSoul],
        // get and optionally create graph root node...
        //console.log("DEUG", path[0])
        currentNode = handleGunNode(rootSoul)   // create because root will be needed later...
        //console.log("graphology::ROOT", currentPath, gunPath, `lastKey=${endOfPathKey}`, `secondLastKey=${secondLastPathKey}`, currentNode)
        // handle all sub path parts...
        //gunPath.slice(1).forEach(key => {
        for (let key of gunPath.slice(1)) {
            currentPath.push(key)
            //console.log("graphology", key, currentPath, gunPath, `${gunPath.slice(-2, -1)} == ${key}`)
            if(key == endOfPathKey) {
                return currentNode
            } else if(currentNode[key] && currentNode[key][0] == '#') {
                currentNode = handleGunNode(currentNode[key], {}, currentPath)
            } else if(secondLastPathKey == key && !createIfNotExists) {
                //console.log("Second last path key... Create and return a temp node without save to storage", key, currentPath)
                return handleGunNode(null, { [endOfPathKey]: null, ['#']: {parent: currentNode.soul(), parentKey: key, tmp: true }}, currentPath, false)
            } else if(!createIfNotExists) { // case "get()"?
                //console.log("Shouldn't create persistent graph nodes e.g. GET() call... Return a temp object here..., need to walk graph later to handle parent...")
                return handleGunNode(null, { [endOfPathKey]: null, ['#']: {parent: null, parentKey: secondLastPathKey, tmp: true }}, gunPath, false)   
            } else {
                let newNode = handleGunNode(null, { ['#']: {parent: currentNode.soul(), parentKey: key }}, currentPath, createIfNotExists)
                currentNode[key] = newNode.soul()
                handleGunNode(currentNode.soul(), currentNode, currentNode.path())
                //console.log('DEBUG', currentNode, newNode)
                currentNode = newNode
            }
        }
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
            let node = JSON.parse(localStorage.getItem(key))
            console.log("miniGun::load - retrieve node from graph", key, node)
            return node
        },
        store: (key, node) => {
            console.log("miniGun::store - save node to graph", key, node)
            localStorage.setItem(key, JSON.stringify(node))
        },
        // Gun API
        get: function(path) {
            let 
            newPath = pathToArray(this.path(), path),
            //newObject = new Proxy(new Gun({}, newPath), miniGunHandler)
            newObject = graphology(newPath, false)  // false = try to get graph node, but don't build the hole graph if not exists...
            newObject = new Proxy(newObject, miniGunHandler)
            //console.log("Gun::GET", `InputPath="${path}"`, `NewPath="${newPath.join(pathDelimiter)}"`, "returnObject:", newObject, "thisArg", this)
            return newObject
        },
        put: function(value) {
            let 
            key = this.path().slice(-1),
            node = graphology(this.path())
            node[key] = value
            node = handleGunNode(node.soul(), node, this.path())
            //console.log("Gun::PUT", `Path="${this.path()}", ${key}="${value}"`, "returnObject:", node, "thisArg", this)
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
    },

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
    },

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
    },

    miniGunCoreInstance = new Proxy(new Gun({['#']: {soul: globalGraphRoot}}, [globalGraphRoot], ['pair', 'user', 'fn']), miniGunHandler)

    // add api features as xT tasks
    gunApiFeatures.fn(gunApiFeatures)
    
    return miniGunCoreInstance
    // per handle gun node method ?!
}
