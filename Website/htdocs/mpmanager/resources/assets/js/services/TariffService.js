import Repository from '../repositories/RepositoryFactory'
import { ErrorHandler } from '../Helpers/ErrorHander'
import { ElasticUsageTimeService } from './ElasticUsageTimeService'

export class TariffService {
    constructor () {
        this.elasticUsageTimesService = new ElasticUsageTimeService()
        this.repository = Repository.get('tariff')
        this.list = []
        this.tariff = {
            id: null,
            name: '',
            price: null,
            currency: null,
            factor: 1,
            accessRate: {
                id: null,
                amount: null,
                period: null,
            },
            socialTariff: {
                id: null,
                dailyAllowance: null,
                price: null,
                initialEnergyBudget: null,
                maximumStackedEnergy: null
            },
            components: [],
            elasticUsageTimes: []
        }
        this.hasAccessRate = false
        this.socialOptions = false


    }

    fromJson (tariffData) {
        let tariff = {
            id: tariffData.id,
            name: tariffData.name,
            price: tariffData.price,
            currency: tariffData.currency,
            factor: tariffData.factor,
            accessRate: {
                id: null,
                amount: null,
                period: null,
            },
            socialTariff: {
                id: null,
                dailyAllowance: null,
                price: null,
                initialEnergyBudget: null,
                maximumStackedEnergy: null
            },
            components: [],
            elasticUsageTimes: []
        }

        if (tariffData.access_rate !== undefined && tariffData.access_rate !== null) {
            this.hasAccessRate = true
            tariff.accessRate = {
                id: tariffData.access_rate.id,
                amount: tariffData.access_rate.amount,
                period: tariffData.access_rate.period
            }
        }
        if (tariffData.social_tariff !== undefined && tariffData.social_tariff !== null) {
            tariff.socialTariff = {
                id :tariffData.social_tariff.id,
                dailyAllowance: tariffData.social_tariff.daily_allowance,
                price: tariffData.social_tariff.price,
                initialEnergyBudget: tariffData.social_tariff.initial_energy_budget,
                maximumStackedEnergy: tariffData.social_tariff.maximum_stacked_energy,
            }
            this.socialOptions = true
        }
        if (tariffData.pricing_component.length > 0) {
            for (let i = 0; i < tariffData.tariff_pricing_components.length; i++) {
                let component = {
                    id: tariffData.tariff_pricing_components[i].id,
                    name: tariffData.tariff_pricing_components[i].name,
                    price: tariffData.tariff_pricing_components[i].price
                }
                tariff.components.push(component)
            }
        }
        if (tariffData.elastic_usage_time.length > 0) {
            for (let i = 0; i < tariffData.elastic_usage_time.length; i++) {
                let elasticUsageTime = {
                    id: tariffData.elastic_usage_time[i].id,
                    start: tariffData.elastic_usage_time[i].start,
                    end: tariffData.elastic_usage_time[i].end,
                    value: tariffData.elastic_usage_time[i].value
                }
                tariff.elasticUsageTimes.push(elasticUsageTime)
            }
        }
        return tariff
    }

    async getTariffs () {
        try {
            let response = await this.repository.list()
            if (response.status === 200 || response.status === 201) {
                this.list = []
                let data = response.data.data
                for (let i in data) {
                    let tariffData = data[i]
                    let tariff = this.fromJson(tariffData)

                    this.list.push(tariff)
                }

                return this.list
            } else {
                return new ErrorHandler(response.error, 'http', response.status)
            }
        } catch (e) {
            let errorMessage = e.response.data.data.message
            return new ErrorHandler(errorMessage, 'http')
        }

    }

    async getTariff (tariffId) {
        try {
            let response = await this.repository.get(tariffId)
            if (response.status === 200) {
                let tariffData = response.data.data
                this.tariff = this.fromJson(tariffData)
                return this.tariff
            } else {
                return new ErrorHandler(response.error, 'http', response.status)
            }
        } catch (e) {
            let errorMessage = e.response.data.data.message
            return new ErrorHandler(errorMessage, 'http')
        }
    }

    async saveTariff (method) {
        let tariffPM = {
            name: this.tariff.name,
            price: Number(this.tariff.price),
            currency: this.currency,
            factor: this.tariff.factor,
        }
        if (this.tariff.components.length > 0)
            tariffPM.components = this.tariff.components
        if (this.tariff.elasticUsageTimes.length > 0)
            tariffPM.elastic_usage_times = this.tariff.elasticUsageTimes

        if (this.tariff.socialTariff.dailyAllowance != null) {
            tariffPM.social_tariff = {
                id: this.tariff.socialTariff.id,
                daily_allowance: this.tariff.socialTariff.dailyAllowance,
                price: this.tariff.socialTariff.price,
                initial_energy_budget: this.tariff.socialTariff.initialEnergyBudget,
                maximum_stacked_energy: this.tariff.socialTariff.maximumStackedEnergy
            }
        }
        if (this.tariff.accessRate.period != null && this.tariff.accessRate.amount != null) {
            tariffPM.access_rate = {
                id: this.tariff.accessRate.id,
                access_rate_period: this.tariff.accessRate.period,
                access_rate_amount: this.tariff.accessRate.amount
            }
        }

        try {
            let response
            if (method === 'create') {

                console.log(tariffPM)
                response = await this.repository.create(tariffPM)
            } else {
                tariffPM.id = this.tariff.id
                console.log(tariffPM)
                response = await this.repository.update(tariffPM)
            }
            if (response.status === 200 || response.status === 201) {
                let tariffData = response.data.data
                return this.getTariff(tariffData.id)
            } else {
                return new ErrorHandler(response.error, 'http', response.status)
            }

        } catch (e) {

            let errorMessage = e.response.data.data.message
            return new ErrorHandler(errorMessage, 'http')
        }

    }

    async removeAdditionalComponent (addedType, id) {
        if (addedType === 'component') {
            let component = this.tariff.components.filter(x => x.id === id)[0]
            if (component !== null) {
                for (let i = 0; i < this.tariff.components.length; i++) {
                    if (this.tariff.components[i].id === component.id) {
                        this.tariff.components.splice(i, 1)
                    }
                }
            }
        } else {
            if (id>0){
                await  this.elasticUsageTimesService.deleteElasticUsage(id)
            }
            let elasticUsageTime = this.tariff.elasticUsageTimes.filter(x => x.id === id)[0]
            if (elasticUsageTime !== null) {
                for (let i = 0; i < this.tariff.elasticUsageTimes.length; i++) {
                    if (this.tariff.elasticUsageTimes[i].id === elasticUsageTime.id) {
                        this.tariff.elasticUsageTimes.splice(i, 1)
                    }
                }
            }
        }

    }

    async tariffUsageCount(id){
        try {
            let response = await  this.repository.usages(id)
            if (response.status===200){
                return  response.data.data
            }else{
                return new ErrorHandler(response.error, 'http', response.status)
            }
        }catch (e) {
            let errorMessage = e.response.data.data.message
            return new ErrorHandler(errorMessage, 'http')
        }
    }

    async deleteTariff(id){
        try {
            let response = await  this.repository.delete(id)
            if (response.status===200){
                return  response.data.data
            }else{
                return new ErrorHandler(response.error, 'http', response.status)
            }
        }catch (e) {
            let errorMessage = e.response.data.data.message
            return new ErrorHandler(errorMessage, 'http')
        }
    }
    setCurrency (currency) {
        this.currency = currency
    }

    addToList (tariff) {
        this.list.push(tariff)
        return this.list
    }

    resetAccessRate () {
        this.tariff.accessRate={
            id: null,
            amount: null,
            period: null,
        }
    }

    addAdditionalCostComponent (addedType) {
        if (addedType === 'component') {

            let component = {
                id: -1 * Math.floor(Math.random() * 10000000),
                name: '',
                price: null
            }
            this.tariff.components.push(component)
        } else {

            let elasticUsageTime = {
                id: -1 * Math.floor(Math.random() * 10000000),
                start: '',
                end: '',
                value: null
            }
            this.tariff.elasticUsageTimes.push(elasticUsageTime)
        }

    }

    resetTariff () {
        this.tariff = {
            id: null,
            name: '',
            price: null,
            currency: null,
            factor: 1,
            accessRate: {
                id: null,
                amount: null,
                period: null,
            },
            socialTariff: {
                id: null,
                dailyAllowance: null,
                price: null,
                initialEnergyBudget: null,
                maximumStackedEnergy: null
            },
            components: [],
            elasticUsageTimes: []
        }
    }

    resetSocialTariff () {
        this.tariff.socialTariff = {
            id:null,
            dailyAllowance: null,
            price: null,
            initialEnergyBudget: null,
            maximumStackedEnergy: null,
        }
    }
}
