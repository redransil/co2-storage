import language from '@/src/mixins/i18n/language.js'

import Header from '@/src/components/helpers/Header.vue'
import JsonEditor from '@/src/components/helpers/JsonEditor.vue'

import { create } from 'ipfs-http-client'
import { CID } from 'multiformats/cid'

import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Textarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'
import Button from 'primevue/button'

import Toast from 'primevue/toast'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import {FilterMatchMode,FilterService} from 'primevue/api'


const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)
}

const computed = {
	schemasClass() {
		return this.theme + '-schemas-' + this.themeVariety
	},
	locale() {
		return this.$store.getters['main/getLocale']
	},
	theme() {
		return this.$store.getters['main/getTheme']
	},
	themeVariety() {
		return this.$store.getters['main/getThemeVariety']
	}
}

const watch = {
	currentProvider: {
		handler() {
			if(this.currentProvider == null) {
				this.selectedAddress = null
				this.$router.push({ path: '/' })
			}
			else {
				this.selectedAddress = this.currentProvider.selectedAddress
			}
		},
		deep: true,
		immediate: false
	},
	walletError: {
		handler() {
			if(this.walletError != null) {
				this.selectedAddress = null
				this.$router.push({ path: '/' })
				// TODO, popup error
			}
		},
		deep: true,
		immediate: false
	},
	async selectedAddress() {
		if(this.selectedAddress == null)
			return

		await this.getWallets()
		await this.loadSchemas()
		this.schemasLoading = false
	},
	json: {
		handler(state, before) {
			if(state)
				this.updateForm()
			
			// If schema content is deleted reset base
			if(this.json && Object.keys(this.json).length === 0 && Object.getPrototypeOf(this.json) === Object.prototype)
				this.base = null
		},
		deep: true,
		immediate: false
	}
}

const mounted = async function() {
	const routeParams = this.$route.params
	if(routeParams['cid'])  {
		this.schemaCid = routeParams['cid']

		await this.getWallets()
		await this.getSchema(this.schemaCid)
	}
}

const methods = {
	// Json editor onChange event handler
	jsonEditorChange(change) {
		switch (this.jsonEditorMode) {
			case 'code':
				this.jsonEditorContent = {
					text: change.updatedContent.text,
					json: null
				}
				if(this.isValidJson(change.updatedContent.text))
					this.json = JSON.parse(change.updatedContent.text)
				break
			case 'tree':
				this.jsonEditorContent = {
					json: change.updatedContent.json,
					text: null
				}
				this.json = JSON.parse(JSON.stringify(change.updatedContent.json))
				break
			default:
				console.log(`Unknown JSON editor mode '${this.jsonEditorMode}'`)
				break
		}
	},
	// Json editor onChangeMode event handler
	jsonEditorModeChange(mode) {
		this.jsonEditorMode = mode
	},
    // Workaround for svelte onError
    isValidJson(input) {
		let str
        try{
			if(typeof input == 'string')
				str = input
			else
				str = JSON.stringify(input) 
            JSON.parse(str);
        }
        catch (e){
            return false
        }
        return true
    },
	// Update for following json is changed and validated
	updateForm() {
		if(Array.isArray(this.json))
			return
			this.formElements.length = 0
		const keys = Object.keys(this.json)
		for (const key of keys) {
			const val = this.json[key]
			let domElement = {}

			const type = val.type
			switch (type) {
				case 'int':
				case 'integer':
					domElement.type = 'InputNumber'
					// Check do we have min/max boudaries set
					if(val.min != undefined) {
						// Min set
						domElement.min = parseInt(val.min)
					}
					if(val.max != undefined) {
						// Max set
						domElement.max = parseInt(val.max)
					}
					domElement.name = key
					domElement.value = (val.value != undefined) ? val.value : 0
					break
				case 'decimal':
				case 'float':
					domElement.type = 'InputDecimal'
					// Fraction digits set
					domElement.fractionDigits = ((val.fractionDigits != undefined)) ? parseInt(val.fractionDigits) : 2

					// Check do we have min/max boudaries set
					if(val.min != undefined) {
						// Min set
						domElement.min = parseFloat(val.min)
					}
					if(val.max != undefined) {
						// Max set
						domElement.max = parseFloat(val.max)
					}
					domElement.name = key
					domElement.value = (val.value != undefined) ? val.value : 0.0
					break
				case 'str':
				case 'string':
					domElement.type = 'InputText'
					// Check do we have min/max boudaries set
					if(val.min != undefined) {
						// Min characters
						domElement.min = parseInt(val.min)
					}
					if(val.max != undefined) {
						// Max characters
						domElement.max = parseInt(val.max)
					}
					domElement.name = key
					domElement.value = (val.value != undefined) ? val.value : ''
					break
				case 'txt':
				case 'text':
				case 'textarea':
					domElement.type = 'Textarea'
					// Check do we have min/max boudaries set
					if(val.min != undefined) {
						// Min characters
						domElement.min = parseInt(val.min)
					}
					if(val.max != undefined) {
						// Max characters
						domElement.max = parseInt(val.max)
					}
					domElement.name = key
					domElement.value = (val.value != undefined) ? val.value : ''
					break
				case 'bool':
				case 'boolean':
					domElement.type = 'InputSwitch'
					domElement.name = key
					domElement.value = (val.value != undefined) ? (val.value.toLowerCase() === 'true') : false
					break
				case 'array':
					// Multiple or single selection needed
					domElement.type = (val.multiple == true) ? 'MultiSelect' : 'Dropdown'
					domElement.name = key
					domElement.options = (val.options != undefined && Array.isArray(val.options)) ? val.options : []
					domElement.value = (val.value != undefined) ? val.value : null
					break
				default:
					console.log(`Unknown property type '${type}'`)
					break
			}
			this.formElements.push(domElement)
		}
	},
	// Check if IPNS key alsready exists
	keyExists(key, keys) {
		return {
			exists: keys.filter((k) => {return k.name == key}).length > 0,
			index: keys.map((k) => {return k.name}).indexOf(key)
		}
	},
	async getWallets() {
		if(this.ipfs == null)
			// Attach to a node
			this.ipfs = await create('/dns4/rqojucgt.co2.storage/tcp/5002/https')

		// Get existing node keys
		this.nodeKeys = await this.ipfs.key.list()

		const walletsChainKeyId = 'co2.storage-wallets'
		const walletsChainKeyCheck = this.keyExists(walletsChainKeyId, this.nodeKeys)
		let walletsChainKey, walletsChainSub, walletsChainCid
		if(!walletsChainKeyCheck.exists) {
			// Create key for wallet chain
			const walletChainKey = await this.ipfs.key.gen(this.selectedAddress, {
				type: 'ed25519',
				size: 2048
			})

			const walletChain = {
				"parent": null,
				"wallet": this.selectedAddress,
				"templates": [],
				"assets": []
			}
			
			const walletChainCid = await this.ipfs.dag.put(walletChain, {
				storeCodec: 'dag-cbor',
				hashAlg: 'sha2-256',
				pin: true
			})

			const walletChainSub = await this.ipfs.name.publish(walletChainCid, {
				lifetime: '87600h',
				key: walletChainKey.id
			})

			this.wallets[this.selectedAddress] = walletChainKey.id

			// Create key for wallets chain
			walletsChainKey = await this.ipfs.key.gen(walletsChainKeyId, {
				type: 'ed25519',
				size: 2048
			})

			// Genesis
			this.wallets.parent = null

			// Create dag struct
			walletsChainCid = await this.ipfs.dag.put(this.wallets, {
				storeCodec: 'dag-cbor',
				hashAlg: 'sha2-256',
				pin: true
			})
	
			// Publish pubsub
			walletsChainSub = await this.ipfs.name.publish(walletsChainCid, {
				lifetime: '87600h',
				key: walletsChainKey.id
			})
		}
		else {
			// Get the key
			walletsChainKey = this.nodeKeys[walletsChainKeyCheck.index]
			const walletsChainKeyName = `/ipns/${walletsChainKey.id}`

			// Resolve IPNS name
			for await (const name of this.ipfs.name.resolve(walletsChainKeyName)) {
				walletsChainCid = name.replace('/ipfs/', '')
			}
			walletsChainCid = CID.parse(walletsChainCid)

			// Get last walletsChain block
			this.wallets = (await this.ipfs.dag.get(walletsChainCid)).value

			// Check if wallets list already contains this wallet
			if(this.wallets[this.selectedAddress] == undefined) {
				// Create key for wallet chain
				const walletChainKey = await this.ipfs.key.gen(this.selectedAddress, {
					type: 'ed25519',
					size: 2048
				})

				const walletChain = {
					"parent": null,
					"wallet": this.selectedAddress,
					"templates": [],
					"assets": []
				}
				
				const walletChainCid = await this.ipfs.dag.put(walletChain, {
					storeCodec: 'dag-cbor',
					hashAlg: 'sha2-256',
					pin: true
				})
	
				const walletChainSub = await this.ipfs.name.publish(walletChainCid, {
					lifetime: '87600h',
					key: walletChainKey.id
				})

				this.wallets[this.selectedAddress] = walletChainKey.id

				this.wallets.parent = walletsChainCid.toString()

				// Create new dag struct
				walletsChainCid = await this.ipfs.dag.put(this.wallets, {
					storeCodec: 'dag-cbor',
					hashAlg: 'sha2-256',
					pin: true
				})

				// Link key to the latest block
				walletsChainSub = await this.ipfs.name.publish(walletsChainCid, {
					lifetime: '87600h',
					key: walletsChainKey.id
				})
			}
		}
//		console.dir(walletsChainCid, {depth: null})
//		console.dir(walletsChainKey, {depth: null})
//		console.dir(walletsChainSub, {depth: null})
	},
	async loadSchemas() {
		let wallets = Object.keys(this.wallets)
		wallets.splice(wallets.indexOf("parent"), 1)
		if(!wallets.length)
			return

		this.schemas.length = 0

		// Browse all wallets for stored schamas
		for (const wallet of wallets) {
			const key = this.wallets[wallet]
			const keyPath = `/ipns/${key}`
			let walletChainCid

			// Resolve IPNS name
			for await (const name of this.ipfs.name.resolve(keyPath)) {
				walletChainCid = name.replace('/ipfs/', '')
			}
			walletChainCid = CID.parse(walletChainCid)

			// Get last walletsChain block
			const walletChain = (await this.ipfs.dag.get(walletChainCid)).value
			this.schemas = this.schemas.concat(walletChain.templates.map((t) => {
				t.creator = wallet
				return t
			}))
		}
	},
	async addSchema() {
		if(this.json && Object.keys(this.json).length === 0 && Object.getPrototypeOf(this.json) === Object.prototype) {
			this.$toast.add({severity:'error', summary:'Empty schema', detail:'Please add environmental asset template definition', life: 3000})
			return
		}

		let walletChainKey = this.wallets[this.selectedAddress]
		if(walletChainKey == undefined) {
			this.$toast.add({severity:'error', summary:'Wallet not connected', detail:'Please connect your wallet in order to add environmental asset template', life: 3000})
			return
		}

		const keyPath = `/ipns/${walletChainKey}`
		let walletChainCid

		// Resolve IPNS name
		for await (const name of this.ipfs.name.resolve(keyPath)) {
			walletChainCid = name.replace('/ipfs/', '')
		}
		walletChainCid = CID.parse(walletChainCid)

		// Get last walletsChain block
		const walletChain = (await this.ipfs.dag.get(walletChainCid)).value

		// Create schema CID
		const schemaCid = await this.ipfs.dag.put(this.json, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		const schema = {
			"creator": this.selectedAddress,
			"cid": schemaCid.toString(),
			"name": this.schemaName,
			"base": this.base,
			"use": 0,
			"fork": 0
		}

		this.schemas.unshift(schema)

		walletChain.templates.push(schema)
		walletChain.parent = walletChainCid.toString()

		// Create new dag struct
		walletChainCid = await this.ipfs.dag.put(walletChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		// Link key to the latest block
		const walletChainSub = await this.ipfs.name.publish(walletChainCid, {
			lifetime: '87600h',
			key: walletChainKey
		})
		
		this.$toast.add({severity:'success', summary:'Created', detail:'Environmental asset template is created', life: 3000})
		
//		console.dir(walletChainCid, {depth: null})
//		console.dir(walletChainKey, {depth: null})
//		console.dir(walletChainSub, {depth: null})
	},
	async setSchema(row) {
		// Get schema
		const schemaCid = CID.parse(row.data.cid)
		const schema = (await this.ipfs.dag.get(schemaCid)).value

		switch (this.jsonEditorMode) {
			case 'code':
				this.jsonEditorContent = {
					text: JSON.stringify(schema),
					json: null
				}
				this.$refs.jsonEditor.setContent({"text": this.jsonEditorContent.text})
				break
			case 'tree':
				this.jsonEditorContent = {
					json: JSON.parse(JSON.stringify(schema)),
					text: null
				}
				this.$refs.jsonEditor.setContent({"json": this.jsonEditorContent.json})
				break
			default:
				console.log(`Unknown JSON editor mode '${this.jsonEditorMode}'`)
				break
		}

		if(!this.schemaName || !this.schemaName.length)
			this.schemaName = `${row.data.name} - cloned by ${this.selectedAddress}`
		this.base = row.data.name
	},
	async getSchema(cid) {
		let walletChainKey = this.wallets[this.selectedAddress]
		if(walletChainKey == undefined) {
			this.$toast.add({severity:'error', summary:'Wallet not connected', detail:'Please connect your wallet in order to see your environmental asset templates', life: 3000})
			return
		}

		const keyPath = `/ipns/${walletChainKey}`
		let walletChainCid

		// Resolve IPNS name
		for await (const name of this.ipfs.name.resolve(keyPath)) {
			walletChainCid = name.replace('/ipfs/', '')
		}
		walletChainCid = CID.parse(walletChainCid)

		// Get last walletsChain block
		const walletChain = (await this.ipfs.dag.get(walletChainCid)).value
		const schemas = walletChain.templates
		const schema = schemas.filter((s) => {return s.cid == cid})[0]
		this.schemaName = schema.name
		this.base = schema.base
		await this.setSchema({"data": {"cid": schema.cid}})
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		language
	],
	components: {
		Header,
		JsonEditor,
		InputText,
		InputNumber,
		Dropdown,
		MultiSelect,
		Textarea,
		InputSwitch,
		Button,
		Toast,
		DataTable,
		Column
	},
	directives: {
	},
	name: 'Schemas',
	data () {
		return {
			currentProvider: null,
			selectedAddress: null,
			walletError: null,
			jsonEditorContent: {
				text: undefined,
				json: {}
			},
			jsonEditorMode: 'tree',
			validJson: false,
			json: null,
			formElements: [],
			schemas: [],
			schemasFilters: {
				'creator': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'base': {value: null, matchMode: FilterMatchMode.CONTAINS}
			},
			schemasMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			schemasLoading: true,
			base: null,
			schemaName: '',
			ipfs: null,
			nodeKeys: [],
			wallets: {},
			schemaCid: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
