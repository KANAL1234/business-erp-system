import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "-"
  try {
    return format(new Date(date), "dd/MM/yyyy")
  } catch (error) {
    return "-"
  }
}

export async function getFormattedAddress(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
    const data = await response.json()
    return data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`
  } catch (error) {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
  }
}
