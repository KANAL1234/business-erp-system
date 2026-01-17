'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useCreateVendor } from '@/lib/queries/vendors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type VendorFormData = {
    name: string
    contact_person: string
    phone: string
    email: string
    address: string
    city: string
    ntn: string
    payment_terms_days: number
    vendor_category: string
    notes: string
}

export default function NewVendorPage() {
    const router = useRouter()
    const createVendor = useCreateVendor()

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<VendorFormData>({
        defaultValues: {
            payment_terms_days: 30,
        }
    })

    const onSubmit = async (data: VendorFormData) => {
        try {
            await createVendor.mutateAsync(data)

            toast.success('Success', {
                description: 'Vendor created successfully!',
            })

            router.push('/dashboard/vendors')
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    return (
        <div className="px-4 sm:px-0">
            <div className="flex items-center mb-6">
                <Link href="/dashboard/vendors">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold text-gray-900 ml-4">Add New Vendor</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Vendor Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Vendor Name *</Label>
                                <Input
                                    id="name"
                                    {...register('name', { required: 'Vendor name is required' })}
                                    placeholder="ABC Traders"
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contact_person">Contact Person</Label>
                                <Input
                                    id="contact_person"
                                    {...register('contact_person')}
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone *</Label>
                                <Input
                                    id="phone"
                                    {...register('phone', { required: 'Phone is required' })}
                                    placeholder="051-XXXXXXX"
                                />
                                {errors.phone && (
                                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    {...register('email')}
                                    placeholder="vendor@example.com"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input
                                    id="address"
                                    {...register('address')}
                                    placeholder="Street address"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    {...register('city')}
                                    placeholder="Rawalpindi"
                                />
                            </div>
                        </div>

                        {/* Business Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ntn">NTN</Label>
                                <Input
                                    id="ntn"
                                    {...register('ntn')}
                                    placeholder="XXXXXXX-X"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="vendor_category">Category</Label>
                                <Select onValueChange={(value) => setValue('vendor_category', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OIL_SUPPLIER">Oil Supplier</SelectItem>
                                        <SelectItem value="PARTS_SUPPLIER">Parts Supplier</SelectItem>
                                        <SelectItem value="SERVICES">Services</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="payment_terms_days">Payment Terms (Days)</Label>
                                <Input
                                    id="payment_terms_days"
                                    type="number"
                                    {...register('payment_terms_days')}
                                    placeholder="30"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                {...register('notes')}
                                placeholder="Additional notes about this vendor..."
                                rows={3}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <Button type="submit" disabled={createVendor.isPending}>
                                {createVendor.isPending ? 'Creating...' : 'Create Vendor'}
                            </Button>
                            <Link href="/dashboard/vendors">
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
