<template>
    <!-- modal-->
    <div>
        <widget :title="$tc('phrases.newSms')" color="red">
            <md-card class="md-size-80">
                <md-card-header>

                    <md-tabs>
                        <md-tab
                            role="presentation"
                            :class="tab==='person' ? 'active' :''"
                            :md-label="$tc('words.people')"
                            @click="tab='person'"
                            exact
                        ></md-tab>
                        <md-tab
                            role="presentation"
                            :class="tab==='group' ? 'active' :''"
                            :md-label="$tc('phrases.connectionGroup')"
                            @click="tab='group'"
                        ></md-tab>
                        <md-tab
                            role="presentation"
                            :class="tab==='type' ? 'active' :''"
                            :md-label="$tc('phrases.connectionType')"
                            @click="tab='type'"
                        ></md-tab>
                        <md-tab
                            role="presentation"
                            :class="tab==='all' ? 'active' :''"
                            :md-label="$tc('phrases.wholeVillage')"
                            @click="tab='all'"
                        ></md-tab>
                    </md-tabs>
                </md-card-header>
                <md-card-content>
                    <div class="md-layout">
                        <div class="row">
              <span v-for="r in receiverList" style="margin: 3px;" :key="r.id">
                <button
                    @click="removeReceiver(r)"
                    class="btn btn-primary btn-sm"
                    v-if="r.stored"
                    style="margin: 0.3vh 0;"
                >{{r.receiver.name}}{{r.receiver.surname}}</button>
                <button
                    @click="removeReceiver(r)"
                    class="btn btn-sm btn-info"
                    v-else
                    style="margin: 0.3vh 0;"
                >{{r.receiver}}</button>
              </span>
                        </div>
                        <div class="md-layout-item md-size-100" v-if="tab !=='person'">
                            <md-field>
                                <label>{{ $tc('words.miniGrid') }}</label>
                                <md-select id="miniGrid_select" v-model="miniGrid">
                                    <md-option value="0">{{ $tc('words.all') }}</md-option>
                                    <md-option v-for="mg in miniGridList" :value="mg.id" :key="mg.id">{{mg.name}}
                                    </md-option>
                                </md-select>
                            </md-field>
                        </div>
                        <div class="md-layout-item md-size-100" v-if="tab ==='person'">
                            <md-autocomplete
                                v-model="customerSearchTerm"

                                :md-options="resultList"
                                @md-changed="searchForPerson"
                                @md-opened="searchForPerson"
                                @md-selected="[resultList.id !== -1 ? selectCustomer : null]"
                            >
                                <label for="receiver">{{ $tc('words.receiver') }}</label>

                                <template slot="md-autocomplete-item" slot-scope="{ item }">{{ item.name}}
                                    {{item.surname}}
                                </template>
                            </md-autocomplete>
                        </div>

                        <div class="md-layout-item md-size-100" v-if="tab==='type' || tab ==='group'">
                            <md-field>
                                <label>{{ $tc('words.receiver') }}</label>
                                <md-select id="receiver_select" v-model="receiver">
                                    <md-option value selected>-- {{ $tc('words.select') }} --</md-option>
                                    <md-option v-for="r in resultList" :value="r.id" :key="r.id">{{r.name}}</md-option>
                                </md-select>
                            </md-field>
                        </div>

                        <div class="md-layout-item md-size-100">
                            <md-field>
                                <label for="receiver">{{ $tc('words.message') }}</label>
                                <md-textarea
                                    rows="10"
                                    class="form-control"
                                    id="message"
                                    v-model="message"
                                    placeholder="Message"
                                ></md-textarea>
                            </md-field>
                        </div>
                    </div>
                </md-card-content>
                <md-card-actions>
                    <div class="md-layout">
                        <md-button class="md-raised md-primary" @click="sendConfirm">{{ $tc('words.send') }}</md-button>
                    </div>
                </md-card-actions>
            </md-card>
        </widget>
    </div>
    <!-- modal -->
</template>

<script>
import Widget from '../../shared/widget'
import { MiniGridService } from '../../services/MiniGridService'
import { SmsService } from '../../services/SmsService'

const debounce = require('debounce')
export default {
    name: 'NewSms',
    components: { Widget },
    props: {
        show: {
            type: Boolean,
            default: false,
        }
    },
    mounted () {
        this.senderId = this.$store.state.admin.id
        this.getMiniGrids()
    },
    data () {
        return {
            smsService: new SmsService(),
            miniGridService: new MiniGridService(),
            receiver: '',
            message: '',
            receiverList: [],
            searching: false,
            tab: 'person',
            resultList: [],
            miniGridList: [],
            miniGrid: 0,
            customerSearchTerm: '',
            senderId: null
        }
    },

    watch: {
        tab: function () {
            this.receiverList = []
            this.receiver = ''
            this.resultList = []
            this.search()
        },
        receiver: debounce(function () {

            if (this.receiver.length >= 3) {
                this.searching = true
                this.search()
            } else {
                this.searching = false
                this.resultList = []
            }

            this.search(this.searchTerm)
        }, 250),
    },
    methods: {
        async getMiniGrids () {
            try {
                this.miniGridList = await this.miniGridService.getMiniGrids()

            } catch (e) {
                this.alertNotify('error', e.message)
            }
        },
        search () {
            if (this.tab === 'group') {
                this.searchForConnectionGroup()
            } else if (this.tab === 'type') {
                this.searchForConnectionType()
            }
        },
        selectCustomer (c) {

            this.customerSearchTerm = c.name
            this.addReceiver(c)

        },

        async searchForPerson (term) {
            if (term !== undefined && term.length > 2) {
                try {
                    this.resultList = this.smsService.searchPerson(term).then(r => {
                        return r.map(x => ({
                            'id': x.id,
                            'name': x.name,
                            'surname': x.surname,
                            'toLowerCase': () => x.name.toLowerCase(),
                            'toString': () => x.name
                        }))
                    })

                } catch (e) {
                    this.alertNotify('error', e.message)
                }
            } else {
                this.resultList = new Promise(resolve => {
                    window.setTimeout(() => {

                        resolve([
                            {
                                'id': -1,
                                'name': '--- Entered at Least 3 letters ---',
                                'surname': '',
                                'toLowerCase': () => '',
                                'toString': () => ''
                            }
                        ])

                    }, 500)
                })
            }

        },
        async searchForConnectionGroup () {
            try {
                this.resultList = await this.smsService.getGroups()
            } catch (e) {
                this.alertNotify('error', e.message)
            }

        },
        async searchForConnectionType () {
            try {
                this.resultList = await this.smsService.getTypes()
            } catch (e) {
                this.alertNotify('error', e.message)
            }
        },

        addReceiver (receiver) {
            this.receiverList = this.smsService.addReceiver(receiver)
        },
        removeReceiver (receiver) {
            this.receiverList = this.smsService.removeReceiver(receiver)
        },
        closeSearch () {
            this.searching = false
            this.resultList = []
            this.receiver = ''
        },
        closeModal () {
            this.$emit('closeModal')
        },
        sendConfirm () {
            this.$swal({
                type: 'question',
                allowOutsideClick: false,
                title: this.$tc('phrases.bulkSms',0),
                text: this.$tc('phrases.bulkSms',1),
                cancelButtonText: this.$tc('words.cancel'),
                showCancelButton: true,
            }).then((value) => {
                if (value.value === true)
                    this.send()
            })
        },
        async send () {
            let receivers = null
            if (this.tab === 'person') {
                receivers = this.receiverList.map(x => x.stored ? x.receiver.addresses[0].phone : x.receiver)
            } else {
                if (this.receiver === '-- ' + this.$tc('words.select') + ' --') {
                    alert('Select a receiver from the list')
                    return
                }
                receivers = this.receiver
            }
            try {
                await this.smsService.sendBulk(this.tab, this.miniGrid, receivers, this.message, this.senderId)
                this.alertNotify('success', this.$tc('phrases.bulksms',2))
                this.$emit('smsSent')
                this.message = ''
                this.customerSearchTerm = ''
                this.tab = 'person'
            } catch (e) {
                this.alertNotify('error', e.message)
            }
        },
        alertNotify (type, message) {
            this.$notify({
                group: 'notify',
                type: type,
                title: type + ' !',
                text: message
            })
        },
    }
}
</script>

<style scoped>
    .comment-box {
        border-bottom: 1px dotted #ccc;
        padding: 5px;
        margin-bottom: 5px;
    }

    .modal-mask {
        position: fixed;
        z-index: 1001;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: table;
        transition: opacity 0.3s ease;
    }

    .modal-wrapper {
        display: table-cell;
        vertical-align: middle;
    }

    .modal-container {
        margin: 0px auto;
        padding: 20px 30px;
        background-color: #fff;
        border-radius: 2px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
        transition: all 0.3s ease;
        font-family: Helvetica, Arial, sans-serif;
        max-height: 85%;
        overflow-y: scroll;
    }

    @media only screen and (max-width: 1024px) {
        .modal-container {
            width: 99% !important;
        }
    }

    @media only screen and (min-width: 1024px) {
        .modal-container {
            width: 55% !important;
        }
    }

    .modal-header h3 {
        margin-top: 0;
        color: #42b983;
    }

    .modal-body {
        margin: 20px 0;
    }

    .modal-default-button {
        float: right;
    }

    /*
         * The following styles are auto-applied to elements with
         * transition="modal" when their visibility is toggled
         * by Vue.js.
         *
         * You can easily play with the modal transition by editing
         * these styles.
         */

    .modal-enter {
        opacity: 0;
    }

    .modal-leave-active {
        opacity: 0;
    }

    .modal-enter .modal-container,
    .modal-leave-active .modal-container {
        -webkit-transform: scale(1.1);
        transform: scale(1.1);
    }
</style>
