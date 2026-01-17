'use client'

import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type SortOption = {
    value: string
    label: string
}

type ListSortControlsProps = {
    sortBy: string
    sortOrder: 'asc' | 'desc'
    options: SortOption[]
    onSortByChange: (value: string) => void
    onSortOrderChange: (value: 'asc' | 'desc') => void
    className?: string
}

export function ListSortControls({
    sortBy,
    sortOrder,
    options,
    onSortByChange,
    onSortOrderChange,
    className,
}: ListSortControlsProps) {
    return (
        <div className={cn('flex flex-wrap items-end gap-3', className)}>
            <div className="space-y-1">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={onSortByChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <Label>Order</Label>
                <Select value={sortOrder} onValueChange={(value) => onSortOrderChange(value as 'asc' | 'desc')}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="desc">Newest</SelectItem>
                        <SelectItem value="asc">Oldest</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
