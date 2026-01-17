'use client'

import { useRouter, useParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { useCategories, useUOMs, useProduct, useUpdateProduct } from '@/lib/queries/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Package, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

type ProductFormData = {
    sku: string
    name: string
    description: string
    category_id: string
    uom_id: string
    cost_price: number
    selling_price: number
    wholesale_price: number
    reorder_point: number
    barcode: string
}

export default function EditProductPage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }
    const { data: categories } = useCategories()
    const { data: uoms } = useUOMs()
    const { data: product, isLoading: isLoadingProduct } = useProduct(id)
    const updateProduct = useUpdateProduct()

    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ProductFormData>()

    useEffect(() => {
        if (product) {
            reset({
                sku: product.sku,
                name: product.name,
                description: product.description || '',
                category_id: product.category_id,
                uom_id: product.uom_id,
                cost_price: product.cost_price || 0,
                selling_price: product.selling_price || 0,
                wholesale_price: product.wholesale_price || 0,
                reorder_point: product.reorder_point || 0,
                barcode: product.barcode || '',
            })
        }
    }, [product, reset])

    const onSubmit = async (data: ProductFormData) => {
        try {
            await updateProduct.mutateAsync({
                id,
                ...data,
                cost_price: Number(data.cost_price),
                selling_price: Number(data.selling_price),
                wholesale_price: Number(data.wholesale_price),
                reorder_point: Number(data.reorder_point),
            })

            toast.success('Product updated successfully!')
            router.push('/dashboard/products')
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    if (isLoadingProduct) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
                <p className="text-slate-500 font-medium">Loading product details...</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/products">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Edit Product</h2>
                    <p className="text-slate-500">Update the details for "{product?.name}".</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Package className="h-5 w-5 text-slate-400" />
                                    Basic Information
                                </CardTitle>
                                <CardDescription>Primary details about the product.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="sku">SKU *</Label>
                                        <Input
                                            id="sku"
                                            {...register('sku', { required: 'SKU is required' })}
                                            placeholder="e.g. OIL-001"
                                            className={errors.sku ? 'border-red-500' : ''}
                                        />
                                        {errors.sku && (
                                            <p className="text-xs text-red-500 font-medium">{errors.sku.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="barcode">Barcode</Label>
                                        <Input
                                            id="barcode"
                                            {...register('barcode')}
                                            placeholder="e.g. 1234567890123"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name">Product Name *</Label>
                                    <Input
                                        id="name"
                                        {...register('name', { required: 'Name is required' })}
                                        placeholder="e.g. Havoline 20W-50 - 1L"
                                        className={errors.name ? 'border-red-500' : ''}
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        {...register('description')}
                                        placeholder="Provide a detailed description of the product..."
                                        rows={4}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Classification</CardTitle>
                                <CardDescription>Assign category and measuring units.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="category_id">Category *</Label>
                                        <Controller
                                            name="category_id"
                                            control={control}
                                            rules={{ required: 'Category is required' }}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                                    <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories?.map((category) => (
                                                            <SelectItem key={category.id} value={category.id}>
                                                                {category.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {errors.category_id && (
                                            <p className="text-xs text-red-500 font-medium">{errors.category_id.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="uom_id">Unit of Measure *</Label>
                                        <Controller
                                            name="uom_id"
                                            control={control}
                                            rules={{ required: 'UOM is required' }}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                                    <SelectTrigger className={errors.uom_id ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Select UOM" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {uoms?.map((uom) => (
                                                            <SelectItem key={uom.id} value={uom.id}>
                                                                {uom.name} ({uom.code})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {errors.uom_id && (
                                            <p className="text-xs text-red-500 font-medium">{errors.uom_id.message}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Pricing</CardTitle>
                                <CardDescription>Set costs and margins.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cost_price">Cost Price (Rs.) *</Label>
                                    <Input
                                        id="cost_price"
                                        type="number"
                                        step="0.01"
                                        {...register('cost_price', { required: 'Cost price is required' })}
                                        placeholder="0.00"
                                    />
                                    {errors.cost_price && (
                                        <p className="text-xs text-red-500 font-medium">{errors.cost_price.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="selling_price">Selling Price (Rs.) *</Label>
                                    <Input
                                        id="selling_price"
                                        type="number"
                                        step="0.01"
                                        {...register('selling_price', { required: 'Selling price is required' })}
                                        placeholder="0.00"
                                    />
                                    {errors.selling_price && (
                                        <p className="text-xs text-red-500 font-medium">{errors.selling_price.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="wholesale_price">Wholesale Price (Rs.)</Label>
                                    <Input
                                        id="wholesale_price"
                                        type="number"
                                        step="0.01"
                                        {...register('wholesale_price')}
                                        placeholder="0.00"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Inventory Controls</CardTitle>
                                <CardDescription>Manage stock thresholds.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label htmlFor="reorder_point">Reorder Point</Label>
                                    <Input
                                        id="reorder_point"
                                        type="number"
                                        {...register('reorder_point')}
                                        placeholder="10"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex flex-col gap-2">
                            <Button type="submit" size="lg" className="w-full" disabled={updateProduct.isPending}>
                                <Save className="mr-2 h-4 w-4" />
                                {updateProduct.isPending ? 'Updating...' : 'Update Product'}
                            </Button>
                            <Link href="/dashboard/products">
                                <Button type="button" variant="ghost" className="w-full">
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
