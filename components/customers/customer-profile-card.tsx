'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Phone,
    Mail,
    MapPin,
    CreditCard,
    Calendar,
    User,
    Building2,
    CheckCircle2,
    XCircle
} from 'lucide-react'
import type { Customer } from '@/lib/types/database'

interface CustomerProfileCardProps {
    customer: Customer
}

export function CustomerProfileCard({ customer }: CustomerProfileCardProps) {
    return (
        <Card className="shadow-sm overflow-hidden border-slate-200">
            <CardHeader className="bg-slate-50 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full border shadow-sm">
                            {customer.customer_type === 'BUSINESS' ? (
                                <Building2 className="h-5 w-5 text-primary" />
                            ) : (
                                <User className="h-5 w-5 text-emerald-600" />
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold text-slate-900 leading-tight">
                                {customer.name}
                            </CardTitle>
                            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                                {customer.customer_code}
                            </span>
                        </div>
                    </div>
                    <Badge variant={customer.is_active ? "default" : "secondary"} className={customer.is_active ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}>
                        {customer.is_active ? (
                            <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Active
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Inactive
                            </div>
                        )}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Contact Info */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Contact Information</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span>{customer.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="truncate">{customer.email || 'No email provided'}</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm text-slate-600">
                            <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                            <span className="leading-relaxed">{customer.address || 'No address provided'}</span>
                        </div>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Credit & Terms</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 border border-red-100">
                            <div className="flex items-center gap-2 text-sm text-red-700">
                                <CreditCard className="h-4 w-4" />
                                <span>Current Balance</span>
                            </div>
                            <span className="font-mono font-bold text-red-700">
                                PKR {customer.current_balance?.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between px-2 text-sm text-slate-600">
                            <span>Credit Limit:</span>
                            <span className="font-mono font-medium text-slate-900">
                                PKR {customer.credit_limit?.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between px-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>Credit Terms:</span>
                            </div>
                            <span className="font-medium text-slate-900">
                                {customer.credit_days} Days
                            </span>
                        </div>
                    </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Tax & Profile</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-2 text-sm text-slate-600">
                            <span>NTN Status:</span>
                            <span className="font-medium text-slate-900">{customer.ntn || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between px-2 text-sm text-slate-600">
                            <span>Category:</span>
                            <Badge variant="outline" className="text-[10px]">
                                {customer.customer_type}
                            </Badge>
                        </div>
                        {customer.is_vip && (
                            <div className="flex items-center gap-2 px-2 text-sm text-amber-600 font-medium">
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                                    VIP Customer
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
