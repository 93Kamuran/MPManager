<?php

namespace Tests\Feature;

use App\Models\Address\Address;
use App\Models\MainSettings;
use App\Models\Manufacturer;
use App\Models\Meter\Meter;
use App\Models\Meter\MeterTariff;
use App\Models\Meter\MeterType;
use App\Models\Person\Person;
use App\Models\Sms;
use App\Models\SmsBody;
use App\Models\SmsResendInformationKey;
use App\Models\Transaction\Transaction;
use App\Models\Transaction\VodacomTransaction;
use App\Models\User;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tymon\JWTAuth\Facades\JWTAuth;

class SendSms extends TestCase
{
    use RefreshDatabase;

    /*  ./vendor/bin/phpunit ./tests/Feature/SendSms  */
    /** @test */
    public function store_and_send()
    {
        $this->withoutExceptionHandling();
        $person = $this->initializeData();
        $user = factory(User::class)->create();
        $data = $this->getData($person, $user);
        $response = $this->actingAs($user)->post('/api/sms/storeandsend', $data);
        $response->assertStatus(201);
        $smsCount = Sms::query()->first()->count();
        $this->assertEquals(1, $smsCount);
    }

    /** @test */
    public function store()
    {
        $this->withoutExceptionHandling();
        $person = $this->initializeData();

        $user = factory(User::class)->create();
        $data = [
            'sender' => $person->addresses[0]->phone,
            'message' => 'Resend 4700005646'
        ];
        $response = $this->actingAs($user)->post('/api/sms', $data);
        $response->assertStatus(200);
        $smsCount = Sms::query()->first()->count();
        $this->assertEquals(1, $smsCount);
    }

    private function initializeData()
    {
        $bodies = [
            [
                'reference' => 'SmsTransactionHeader',
                'place_holder' => 'Dear [name] [surname], we received your transaction [transaction_amount].',
                'variables' => 'name,surname,transaction_amount',
                'title' => 'Sms Header'
            ],
            [
                'reference' => 'SmsReminderHeader',
                'place_holder' => 'Dear [name] [surname],',
                'variables' => 'name,surname',
                'title' => 'Sms Header'
            ],
            [
                'reference' => 'SmsResendInformationHeader',
                'place_holder' => 'Dear [name] [surname], we received your resend last transaction information demand.',
                'variables' => 'name,surname',
                'title' => 'Sms Header'
            ],
            [
                'reference' => 'EnergyConfirmation',
                'place_holder' => 'Meter: [meter] , [token]  Unit [energy] .',
                'variables' => 'meter,token,energy',
                'title' => 'Meter Charge'
            ],
            [
                'reference' => 'AccessRateConfirmation',
                'place_holder' => 'Service Charge: [amount] ',
                'variables' => 'amount',
                'title' => 'Tariff Fixed Cost'
            ],
            [
                'reference' => 'AssetRateReminder',
                'place_holder' => 'the next rate of  [appliance_type_name] ( . [remaining] . ) is due on [due_date]',
                'variables' => 'appliance_type_name,remaining,due_date',
                'title' => 'Appliance Payment Reminder'

            ],
            [
                'reference' => 'AssetRatePayment',
                'place_holder' => 'Appliance:   [appliance_type_name]  [amount]',
                'variables' => 'appliance_type_name,amount',
                'title' => 'Appliance Payment'
            ],
            [
                'reference' => 'OverdueAssetRateReminder',
                'place_holder' => 'you forgot to pay the rate of [appliance_type_name] ( [remaining] )  on [due_date]. Please pay it as soon as possible, unless you wont be able to buy energy.',
                'variables' => 'appliance_type_name,remaining,due_date',
                'title' => 'Overdue Appliance Payment Reminder'
            ],
            [
                'reference' => 'PricingDetails',
                'place_holder' => 'Transaction amount is [amount], \n VAT for energy : [vat_energy] \n VAT for the other staffs : [vat_others] . ',
                'variables' => 'amount,vat_energy,vat_others',
                'title' => 'Pricing Details'
            ],
            [
                'reference' => 'ResendInformation',
                'place_holder' => 'Meter: [meter] , [token]  Unit [energy] KWH. Service Charge: [amount]',
                'variables' => 'meter,token,energy,amount',
                'title' => 'Resend Last Transaction Information'
            ],
            [
                'reference' => 'ResendInformationLastTransactionNotFound',
                'place_holder' => 'Last transaction information not found for Meter: [meter]',
                'variables' => 'meter',
                'title' => 'Last Transaction Information Not Found'
            ],
            [
                'reference' => 'SmsReminderFooter',
                'place_holder' => 'Your Company etc.',
                'variables' => '',
                'title' => 'Sms Footer'
            ],
            [
                'reference' => 'SmsTransactionFooter',
                'place_holder' => 'Your Company etc.',
                'variables' => '',
                'title' => 'Sms Footer'
            ],
            [
                'reference' => 'SmsResendInformationFooter',
                'place_holder' => 'Your Company etc.',
                'variables' => '',
                'title' => 'Sms Footer'
            ]
        ];
        foreach ($bodies as $body) {
            SmsBody::query()->create([
                'reference' => $body['reference'],
                'place_holder' => $body['place_holder'],
                'body' => $body['place_holder'],
                'variables' => $body['variables'],
                'title' => $body['title']
            ]);
        }

        //create resend key
        factory(SmsResendInformationKey::class)->create();

        //create settings
        factory(MainSettings::class)->create();

        //create person
        factory(Person::class)->create();
        //create meter-tariff
        factory(MeterTariff::class)->create();

        //create meter-type
        MeterType::query()->create([
            'online' => 0,
            'phase' => 1,
            'max_current' => 10,
        ]);

        //create calin manufacturer
        Manufacturer::query()->create([
            'name' => 'CALIN',
            'website' => 'http://www.calinmeter.com/',
            'api_name' => 'CalinApi',
        ]);

        //create meter
        Meter::query()->create([
            'serial_number' => '4700005646',
            'meter_type_id' => 1,
            'in_use' => 1,
            'manufacturer_id' => 1,
        ]);

        //associate meter with a person
        $p = Person::query()->first();
        $p->meters()->create([
            'tariff_id' => 1,
            'meter_id' => 1,
            'connection_type_id' => 1,
            'connection_group_id' => 1,
        ]);

        //associate address with a person
        $address = Address::query()->create([
            'phone' => '+905396398161',
            'is_primary' => 1,
            'owner_type' => 'person',
            'owner_id' => 1,
        ]);
        $address->owner()->associate($p);

        //create transaction
        factory(VodacomTransaction::class)->create();

        $transaction = factory(Transaction::class)->make();
        $transaction->message = '4700005646';

        return $p;
    }

    public function actingAs($user, $driver = null)
    {
        $token = JWTAuth::fromUser($user);
        $this->withHeader('Authorization', "Bearer {$token}");
        parent::actingAs($user);

        return $this;
    }

    /**
     * @param $person
     * @param $user
     * @return array
     */
    public function getData($person, $user): array
    {
        $data = [
            'person_id' => $person->id,
            'message' => 'Its a dummy message',
            'senderId' => $user->id
        ];
        return $data;
    }
}
