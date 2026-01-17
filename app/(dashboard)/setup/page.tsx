'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Building2, Calendar, Banknote, DollarSign, FileText, ArrowRight, ArrowLeft, Users2 } from 'lucide-react'
import { emitSoftRefresh } from '@/lib/soft-refresh'

type SetupStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

export default function SetupWizardPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState<SetupStep>(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Step 1: Company Information
    const [companyName, setCompanyName] = useState('Business-ERP-Software')
    const [ntn, setNtn] = useState('1234567-8')
    const [strn, setStrn] = useState('ST-123456789')
    const [address, setAddress] = useState('Main Bazaar, Shop No. 123')
    const [city, setCity] = useState('Karachi')
    const [phone, setPhone] = useState('+92-21-12345678')
    const [email, setEmail] = useState('info@bismillahtrading.pk')

    // Step 2: Fiscal Year
    const [fiscalYearStart, setFiscalYearStart] = useState('2025-07-01')
    const [fiscalYearEnd, setFiscalYearEnd] = useState('2026-06-30')

    // Step 3: Bank Accounts
    const [bankName, setBankName] = useState('Habib Bank Limited')
    const [accountNumber, setAccountNumber] = useState('1234567890')
    const [iban, setIban] = useState('PK36HABB0001234567890123')
    const [bankOpeningBalance, setBankOpeningBalance] = useState('500000')

    // Step 4: Opening Balances
    const [cashInHand, setCashInHand] = useState('100000')
    const [inventoryValue, setInventoryValue] = useState('200000')

    // Step 5: HR & Payroll Settings
    const [hrTaxThreshold, setHrTaxThreshold] = useState('50000')
    const [hrTaxRate, setHrTaxRate] = useState('5')
    const [hrEobiAmount, setHrEobiAmount] = useState('250')

    // Step 5: General Tax Settings
    const [gstRate, setGstRate] = useState('18')
    const [whtGoodsRate, setWhtGoodsRate] = useState('4.5')
    const [whtServicesRate, setWhtServicesRate] = useState('10')

    const totalSteps = 7
    const progress = (currentStep / totalSteps) * 100

    const handleNext = () => {
        if (currentStep < 7) {
            setCurrentStep((currentStep + 1) as SetupStep)
        }
    }

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep((currentStep - 1) as SetupStep)
        }
    }

    const handleFinish = async () => {
        setIsSubmitting(true)
        const supabase = createClient()

        try {
            // Update company settings
            const { error: companyError } = await supabase
                .from('company_settings')
                .update({
                    company_name: companyName,
                    ntn,
                    strn,
                    address,
                    city,
                    phone,
                    email,
                    hr_income_tax_threshold: parseFloat(hrTaxThreshold),
                    hr_income_tax_rate: parseFloat(hrTaxRate),
                    hr_eobi_amount: parseFloat(hrEobiAmount),
                    gst_rate: parseFloat(gstRate),
                    wht_goods_rate: parseFloat(whtGoodsRate),
                    wht_services_rate: parseFloat(whtServicesRate)
                })
                .eq('id', (await supabase.from('company_settings').select('id').single()).data?.id)

            if (companyError) throw companyError

            // Update bank account
            const { error: bankError } = await supabase
                .from('bank_accounts')
                .update({
                    bank_name: bankName,
                    account_number: accountNumber,
                    iban,
                    opening_balance: parseFloat(bankOpeningBalance),
                    current_balance: parseFloat(bankOpeningBalance)
                })
                .eq('is_default', true)

            if (bankError) throw bankError

            // Update opening balances in Chart of Accounts
            await supabase
                .from('chart_of_accounts')
                .update({ opening_balance: parseFloat(cashInHand), current_balance: parseFloat(cashInHand) })
                .eq('account_code', '1010')

            await supabase
                .from('chart_of_accounts')
                .update({ opening_balance: parseFloat(bankOpeningBalance), current_balance: parseFloat(bankOpeningBalance) })
                .eq('account_code', '1020')

            await supabase
                .from('chart_of_accounts')
                .update({ opening_balance: parseFloat(inventoryValue), current_balance: parseFloat(inventoryValue) })
                .eq('account_code', '1200')

            // Calculate owner's capital (balancing entry)
            const totalAssets = parseFloat(cashInHand) + parseFloat(bankOpeningBalance) + parseFloat(inventoryValue)
            await supabase
                .from('chart_of_accounts')
                .update({ opening_balance: totalAssets, current_balance: totalAssets })
                .eq('account_code', '3010')

            toast.success('Setup completed successfully!')
            emitSoftRefresh()
            router.push('/dashboard')
        } catch (error: any) {
            console.error('Setup error:', error)
            toast.error('Failed to complete setup: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome to Business-ERP-Software</h1>
                    <p className="text-slate-600">Let's set up your accounting system in a few simple steps</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Step {currentStep} of {totalSteps}</span>
                        <span className="text-sm font-medium text-slate-700">{Math.round(progress)}% Complete</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Setup Card */}
                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {currentStep === 1 && <><Building2 className="h-6 w-6" /> Company Information</>}
                            {currentStep === 2 && <><Calendar className="h-6 w-6" /> Fiscal Year</>}
                            {currentStep === 3 && <><Banknote className="h-6 w-6" /> Bank Account</>}
                            {currentStep === 4 && <><DollarSign className="h-6 w-6" /> Opening Balances</>}
                            {currentStep === 5 && <><FileText className="h-6 w-6" /> Tax Configuration</>}
                            {currentStep === 6 && <><Users2 className="h-6 w-6" /> HR & Payroll Settings</>}
                            {currentStep === 7 && <><CheckCircle2 className="h-6 w-6" /> Review & Confirm</>}
                        </CardTitle>
                        <CardDescription>
                            {currentStep === 1 && 'Enter your business details'}
                            {currentStep === 2 && 'Configure your financial year (Pakistan: July-June)'}
                            {currentStep === 3 && 'Add your primary bank account'}
                            {currentStep === 4 && 'Set your starting balances'}
                            {currentStep === 5 && 'Verify tax rates for Pakistan'}
                            {currentStep === 6 && 'Configure salary taxes and deductions'}
                            {currentStep === 7 && 'Review all settings before finalizing'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Step 1: Company Information */}
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName">Company Name *</Label>
                                        <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City *</Label>
                                        <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ntn">NTN (National Tax Number)</Label>
                                        <Input id="ntn" value={ntn} onChange={(e) => setNtn(e.target.value)} placeholder="1234567-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="strn">STRN (Sales Tax Registration)</Label>
                                        <Input id="strn" value={strn} onChange={(e) => setStrn(e.target.value)} placeholder="ST-123456789" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92-21-12345678" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Fiscal Year */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-primary">
                                        <strong>Pakistan Fiscal Year:</strong> July 1 to June 30
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fyStart">Fiscal Year Start Date</Label>
                                        <Input id="fyStart" type="date" value={fiscalYearStart} onChange={(e) => setFiscalYearStart(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="fyEnd">Fiscal Year End Date</Label>
                                        <Input id="fyEnd" type="date" value={fiscalYearEnd} onChange={(e) => setFiscalYearEnd(e.target.value)} />
                                    </div>
                                </div>

                                <div className="bg-slate-100 rounded-lg p-4">
                                    <p className="text-sm text-slate-700">
                                        <strong>Current Fiscal Year:</strong> FY 2025-2026
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Bank Account */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bankName">Bank Name *</Label>
                                    <Select value={bankName} onValueChange={setBankName}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Habib Bank Limited">Habib Bank Limited (HBL)</SelectItem>
                                            <SelectItem value="Muslim Commercial Bank">Muslim Commercial Bank (MCB)</SelectItem>
                                            <SelectItem value="United Bank Limited">United Bank Limited (UBL)</SelectItem>
                                            <SelectItem value="Allied Bank Limited">Allied Bank Limited</SelectItem>
                                            <SelectItem value="Bank Alfalah">Bank Alfalah</SelectItem>
                                            <SelectItem value="Meezan Bank">Meezan Bank</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="accountNumber">Account Number *</Label>
                                        <Input id="accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="iban">IBAN</Label>
                                        <Input id="iban" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="PK36HABB..." />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bankBalance">Opening Balance (PKR) *</Label>
                                    <Input
                                        id="bankBalance"
                                        type="number"
                                        value={bankOpeningBalance}
                                        onChange={(e) => setBankOpeningBalance(e.target.value)}
                                        placeholder="500000"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 4: Opening Balances */}
                        {currentStep === 4 && (
                            <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-amber-800">
                                        Enter your business's starting balances as of the fiscal year start date.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cashInHand">Cash in Hand (PKR)</Label>
                                    <Input
                                        id="cashInHand"
                                        type="number"
                                        value={cashInHand}
                                        onChange={(e) => setCashInHand(e.target.value)}
                                        placeholder="100000"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="inventory">Inventory Value (PKR)</Label>
                                    <Input
                                        id="inventory"
                                        type="number"
                                        value={inventoryValue}
                                        onChange={(e) => setInventoryValue(e.target.value)}
                                        placeholder="200000"
                                    />
                                </div>

                                <div className="bg-slate-100 rounded-lg p-4">
                                    <p className="text-sm text-slate-700 mb-2"><strong>Summary:</strong></p>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span>Cash in Hand:</span>
                                            <span className="font-medium">PKR {parseFloat(cashInHand || '0').toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Bank Balance:</span>
                                            <span className="font-medium">PKR {parseFloat(bankOpeningBalance || '0').toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Inventory:</span>
                                            <span className="font-medium">PKR {parseFloat(inventoryValue || '0').toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between border-t pt-1 mt-2">
                                            <span className="font-bold">Total Assets:</span>
                                            <span className="font-bold">PKR {(parseFloat(cashInHand || '0') + parseFloat(bankOpeningBalance || '0') + parseFloat(inventoryValue || '0')).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-green-700">
                                            <span className="font-bold">Owner's Capital:</span>
                                            <span className="font-bold">PKR {(parseFloat(cashInHand || '0') + parseFloat(bankOpeningBalance || '0') + parseFloat(inventoryValue || '0')).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Tax Configuration */}
                        {currentStep === 5 && (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-green-800">
                                        <strong>Pakistan Tax Rates</strong> - Pre-configured and ready to use
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 items-center p-3 bg-slate-50 rounded-lg">
                                        <Label htmlFor="gstRate">Sales Tax (GST) %</Label>
                                        <Input id="gstRate" type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 items-center p-3 bg-slate-50 rounded-lg">
                                        <Label htmlFor="whtGoods">WHT on Goods %</Label>
                                        <Input id="whtGoods" type="number" value={whtGoodsRate} onChange={(e) => setWhtGoodsRate(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 items-center p-3 bg-slate-50 rounded-lg">
                                        <Label htmlFor="whtServices">WHT on Services %</Label>
                                        <Input id="whtServices" type="number" value={whtServicesRate} onChange={(e) => setWhtServicesRate(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 6: HR & Payroll Settings */}
                        {currentStep === 6 && (
                            <div className="space-y-4">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-emerald-800">
                                        These settings will be used to calculate monthly payroll automatically.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="hrTaxThreshold">Income Tax Threshold (PKR Monthly)</Label>
                                        <Input
                                            id="hrTaxThreshold"
                                            type="number"
                                            value={hrTaxThreshold}
                                            onChange={(e) => setHrTaxThreshold(e.target.value)}
                                            placeholder="50000"
                                        />
                                        <p className="text-[0.7rem] text-muted-foreground">Salaries above this amount will be taxed.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="hrTaxRate">Income Tax Rate (%)</Label>
                                        <Input
                                            id="hrTaxRate"
                                            type="number"
                                            value={hrTaxRate}
                                            onChange={(e) => setHrTaxRate(e.target.value)}
                                            placeholder="5"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="hrEobiAmount">Fixed EOBI Deduction (PKR)</Label>
                                        <Input
                                            id="hrEobiAmount"
                                            type="number"
                                            value={hrEobiAmount}
                                            onChange={(e) => setHrEobiAmount(e.target.value)}
                                            placeholder="250"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 7: Review & Confirm */}
                        {currentStep === 7 && (
                            <div className="space-y-4">
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-primary">
                                        Please review your settings. You can update these later from the settings page.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold mb-2">Company Information</h3>
                                        <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                                            <p><strong>Name:</strong> {companyName}</p>
                                            <p><strong>NTN:</strong> {ntn}</p>
                                            <p><strong>STRN:</strong> {strn}</p>
                                            <p><strong>City:</strong> {city}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold mb-2">Fiscal Year</h3>
                                        <div className="bg-slate-50 rounded-lg p-3 text-sm">
                                            <p>FY 2025-2026 ({fiscalYearStart} to {fiscalYearEnd})</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold mb-2">Bank Account</h3>
                                        <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                                            <p><strong>Bank:</strong> {bankName}</p>
                                            <p><strong>Account:</strong> {accountNumber}</p>
                                            <p><strong>Opening Balance:</strong> PKR {parseFloat(bankOpeningBalance).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold mb-2">Opening Balances</h3>
                                        <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                                            <p><strong>Cash:</strong> PKR {parseFloat(cashInHand).toLocaleString()}</p>
                                            <p><strong>Inventory:</strong> PKR {parseFloat(inventoryValue).toLocaleString()}</p>
                                            <p className="text-green-700 font-bold pt-2 border-t"><strong>Total Capital:</strong> PKR {(parseFloat(cashInHand) + parseFloat(bankOpeningBalance) + parseFloat(inventoryValue)).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-2">Tax Settings</h3>
                                        <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                                            <p><strong>GST Rate:</strong> {gstRate}%</p>
                                            <p><strong>WHT (Goods):</strong> {whtGoodsRate}%</p>
                                            <p><strong>WHT (Services):</strong> {whtServicesRate}%</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-2">HR & Payroll</h3>
                                        <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                                            <p><strong>Tax Threshold:</strong> PKR {parseFloat(hrTaxThreshold).toLocaleString()}</p>
                                            <p><strong>Tax Rate:</strong> {hrTaxRate}%</p>
                                            <p><strong>EOBI:</strong> PKR {parseFloat(hrEobiAmount).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-6 border-t">
                            <Button
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={currentStep === 1 || isSubmitting}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Previous
                            </Button>

                            {currentStep < 7 ? (
                                <Button onClick={handleNext}>
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button onClick={handleFinish} disabled={isSubmitting}>
                                    {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                                    <CheckCircle2 className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card >
            </div >
        </div >
    )
}
