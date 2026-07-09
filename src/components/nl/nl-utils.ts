import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function nlCn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
