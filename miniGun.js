const
Gun = (() => {
    // temp Storage adapter
    let storage = {
        read: (key) => JSON.parse(localStorage.getItem(key)),
        write: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
        update: (key, val, callback) => {
            let
            oldValue = storage.read(key),
            newValue = callback ? callback(oldValue, val, key) : val
            storage.write(key, newValue)
            return storage.read(key)
        },
        filter: (prop, search) => Object.values(localStorage).map(content => {
            content = JSON.parse(content)
            return content[prop] == search ? content : false 
        }).filter(notEmpty => notEmpty),
        delete: (key) => localStorage.removeItem(key),
        each: (cb) => Object.entries(localStorage).forEach(cb),
        clear: () => localStorage.clear()
    }
    const
    generateSoul = () => '#' + window.crypto.randomUUID(),
    globalGraphRoot = '~global',
    pathDelimiter = '.',
    taskMgr = new xT('miniGun'),
    // SEAlite required: 
    SEAlite = SEA(),
    // Gun API to wrap in xT tasks
    api = {
        get: function(path) {
            path = Array.isArray(path) ? path : path.split(pathDelimiter)
            path = this['#'].path.concat(path)
            //console.log("GET", this['#'].path, path)
            return miniGunReadOrCreateNode(path)
        },
        put: function(value) {
            let 
            path = [ ...this['#'].path ],
            node = graphology(path)
            node[path.slice(-1)] = value
            node = miniGunWrite(node)
            //console.log("PUT", this['#'].path, value, node)
            return node
        },
        set: function(node) {
            if(soul = node['#'].soul) {
                node = miniGunReadOrCreateNode(soul)
                this[soul] = soul
                miniGunWrite(node)
            }
        },
        map: () => console.log("@todo: Gun::map() How to handle list of nodes...?"),
        on: function(callback) {
            let 
            path = this['#'].path,
            node = graphology(path),
            value = node[path.slice(-1)]
            console.log("on", path, value, callback, node)
            console.log("on", "Handle / add listener for updates...")
            console.log("on", "Handle list items too...")
            return value
        },
        once: function(callback) {
            let 
            path = this['#'].path,
            node = graphology(path),
            value = node[path.slice(-1)]
            console.log("once", path, value, callback, node)
            console.log("once", "Handle list items too...")
            return value
        },
        off: () => console.log("@todo: Gun::off()... remove listener by path or path and callback?"),
        /*
        // @todo Listener wildcard for lists ?!
        set: function(node) {
            if(exists = storageRead(node['#'].soul)) {
                node = {...exists, ...node}
                storageWrite(exists._soul, node)
                return node
            }
            node = node instanceof GunNode ? node : new GunNode(node)
            let
            path = [...this['#'].path, node['#'].soul],
            eventName = 'event>' + this['#'].path.join(pathDelimiter),
            graphMount = graphDB(path)
            graphMount[node['#'].soul] = node['#'].soul
            storageWrite(node['#'].soul, {...node}) // save new node item
            //node['#saveNode']()
            storageWrite(graphMount['#'].soul, {...graphMount})  // reference item to list
            //graphMount['#saveNode']()
            console.log('gunSet', node, graphMount, this, `pathEventTriggered: ${eventName}`)
            // trigger path topic Tasks as update event
            taskMgr.emit(this, eventName, graphMount, node)
            return graphMount
        },

        map: function(callback = all => all ) {
            let 
            list = graphDB(this.__path),
            listItems = Object.keys(list).map(nodeSoul => {
                if(nodeSoul[0] != '_' && callback(nodeSoul)) {
                    return new GunNode(storageRead(nodeSoul))
                }
            }).filter(notEmpty => notEmpty)
            return new GunList(listItems, this.__path)
        }, 

        on: function(callback) {
            taskMgr.on('event>' + this['#'].path.join(pathDelimiter), callback)
            if(this.__listItems) {
                console.log("ON", "List", this['#'].listItems, this)
                this['#'].listItems.forEach(item => {
                    taskMgr.emit(item, 'event>' + this['#'].path.join(pathDelimiter), item)
                })
            } else {
                let 
                node = graphDB(this['#'].path),
                key = this['#'].path.slice(-1),
                value = node[key]
                taskMgr.emit(node, 'event>' + this['#'].path.join(pathDelimiter), key, value, node)
                console.log("ON", "Item", key, value, node, this)
            }
        },*/
    },
    // SEA API to wrap in xT tasks
    sea = {
        pair: async () => await SEAlite.pair(),
        user: (pair, alias) => {
            pair.alias = pair.alias ? pair.alias : alias ? alias : pair.soul
            return new Proxy(new gunUser(pair), miniGunHandler)
        },
        sign: async function(data) {
            return await SEAlite.sign(data, this.priv)
        },
        verify: async function(data, signature, foreignPub = this.pub) {
            return await SEAlite.verify(data, signature, foreignPub)
        },
        encrypt: async function(data, foreignPub = this.epub) {
            return await SEAlite.encrypt(data, await SEAlite.secret(foreignPub, this.epriv))
        },
        decrypt: async function(encData, foreignPub = this.epub) {
            return await SEAlite.decrypt(encData, await SEAlite.secret(foreignPub, this.epriv))
        }
    },
    // temp storage helper
    storageRead = (key) => taskMgr.emit('read', key),
    storageWrite = (key, val) => taskMgr.emit('write', key, val),
    // walk graph topology
    graphology = function(path) {
        let
        // Initial need graph root path...
        endOfPathKey = path.slice(-1),
        currentPath = [path[0]],
        // get and optionally create graph root node...
        //console.log("DEUG", path[0])
        currentNode = miniGunReadOrCreateNode(path[0])
        if(!currentNode['#'].soul) {
            currentNode =  miniGunWrite(currentNode)
        }
        //console.log("graphology::ROOT", currentPath, path, currentNode)
        // handle all sub path parts...
        path.slice(1).forEach(key => {
        //for ([key, value] of path.slice(1)) {
            currentPath.push(key)
            //console.log("graphology", key, currentPath, path)
            if(key == endOfPathKey && !currentNode[key]) {
                // just set new key as empty for now... handle values outside...
                currentNode[key] = null
                miniGunWrite(currentNode)
            } else if(currentNode[key] && currentNode[key][0] == '#') {
                currentNode = miniGunReadOrCreateNode(currentNode[key])
            } else {
                let 
                // @todo clean up initial object structure ?!
                newNode = miniGunReadOrCreateNode(currentPath)
                //console.log("CREATE", newNode)
                newNode = miniGunWrite(newNode)    // need new object with soul...
                currentNode[key] = newNode['#'].soul
                miniGunWrite(currentNode)
                //console.log('DEBUG', currentNode, newNode)
                currentNode = newNode
            }
        })
        return currentNode
    },
    // proxy handler
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

    miniGunReadOrCreateNode = (obj, proxied = true) => {
        //console.log("miniGunReadOrCreateNode", obj)
        if(obj.pub) {   // user key pair
            obj = new gunUser(obj)
        } else {        // soul
            let node
            if(obj['#'] && obj['#'].soul) {
                node = storageRead(obj['#'].soul)
            } else {
                node = storageRead(obj)
            }
            if(!node) {
                let path = [ ...Array.isArray(obj) ? obj : obj.split(pathDelimiter) ]
                node = new gunNode({ ['#']: { path: path } })
            }
            obj = node
        }
        return proxied ? new Proxy(obj, miniGunHandler) : obj
    },

    miniGunWrite = (obj) => {
        //console.log("miniGunWrite", obj['#'], obj)
        if(!obj['#'].soul && obj['#'].path.length == 1) {
            //console.log("ROOT NODE", obj['#'], obj)
            obj['#'].soul = obj['#'].path[0]
        } else if(!obj['#'].soul) {
            obj['#'].soul = generateSoul()
        }
        obj['#'].timestamp = Date.now()
        let node = {}
        for (prop in obj) {
            node[prop] = obj[prop]
        }
        // @todo path is needed in node... maybe fix by temp set during object creation...?
        //delete node['#'].path
        //console.log("miniGunWrite DEBUG", node, obj)
        storageWrite(obj['#'].soul, node)
        return { ...obj }
    }

    class gunNode {
        ['#'] = { soul: '', path: [] }

        constructor(nodeObj) {
            Object.assign(this, { ...nodeObj })
        }

        get soul() {
            return this['#'].soul
        }
    }

    class gunUser extends gunNode {
        constructor(userPair) {
            let 
            preparePublicKeys = async () => {
                this.pub = await SEAlite.exportKey(this['#'].pub)
                this.epub = await SEAlite.exportKey(this['#'].epub)
            },
            // prepare users gun node
            userNode = { ...miniGunReadOrCreateNode(userPair.soul, false) }
            userNode['#'] = { ...userPair, path: [userPair.soul] }
            //console.log("userNode", userNode)
            // create node and initialize parent class
            super(userNode)
            // export pub / epub keys
            preparePublicKeys()
        }

        get alias() {
            return this['#'].alias
        }
    }

    // add api features as xT tasks
    Object.entries({ ...api, ...sea, ...storage }).forEach(([feature, action]) => {
        taskMgr.on(feature, action)
    })
    // expose miniGun global root node with api features
    return miniGunReadOrCreateNode(globalGraphRoot)
})()
