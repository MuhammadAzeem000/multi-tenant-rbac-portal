import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { CreateTenantInput } from '@/types/tenant'

function domainify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

const newTenantFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Domain is required')
    .max(255)
    .regex(domainRegex, 'Enter a valid domain, e.g. acme.com'),
  description: z.string().trim().optional().or(z.literal('')),
  adminName: z.string().trim().min(1, "Admin's name is required").max(150),
  adminEmailLocalPart: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .max(64)
    .regex(/^[a-zA-Z0-9._%+-]+$/, 'Only letters, numbers, and . _ % + - are allowed'),
  adminPassword: z.string().min(8, 'At least 8 characters').max(255),
})

export type NewTenantFormValues = z.infer<typeof newTenantFormSchema>

interface NewTenantFormProps {
  formId: string
  onSubmit: (values: CreateTenantInput) => void
}

export function NewTenantForm({ formId, onSubmit }: NewTenantFormProps) {
  const [domainTouched, setDomainTouched] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewTenantFormValues>({ resolver: zodResolver(newTenantFormSchema) })

  const name = watch('name')
  const domain = watch('domain')

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Organization</p>

      <FormField label="Name" required error={errors.name?.message}>
        {(id) => (
          <Input
            id={id}
            invalid={Boolean(errors.name)}
            {...register('name', {
              onChange: (e) => {
                if (!domainTouched) setValue('domain', `${domainify(e.target.value)}.com`)
              },
            })}
          />
        )}
      </FormField>

      <FormField
        label="Domain"
        required
        hint="User emails in this organization are always @this domain. Also used to sign in."
        error={errors.domain?.message}
      >
        {(id) => (
          <Input
            id={id}
            placeholder={name ? `${domainify(name)}.com` : 'acme.com'}
            invalid={Boolean(errors.domain)}
            {...register('domain', { onChange: () => setDomainTouched(true) })}
          />
        )}
      </FormField>

      <FormField label="Description" error={errors.description?.message}>
        {(id) => <Textarea id={id} invalid={Boolean(errors.description)} {...register('description')} />}
      </FormField>

      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Admin account</p>

      <FormField label="Full name" required error={errors.adminName?.message}>
        {(id) => <Input id={id} invalid={Boolean(errors.adminName)} {...register('adminName')} />}
      </FormField>

      <FormField
        label="Email"
        required
        hint="The domain is fixed to the organization's domain above."
        error={errors.adminEmailLocalPart?.message}
      >
        {(id) => (
          <div className="flex">
            <Input
              id={id}
              invalid={Boolean(errors.adminEmailLocalPart)}
              className="rounded-r-none"
              {...register('adminEmailLocalPart')}
            />
            <span className="inline-flex items-center whitespace-nowrap rounded-r-md border border-l-0 border-slate-300 bg-slate-50 px-2.5 text-sm text-slate-500">
              @{domain || 'acme.com'}
            </span>
          </div>
        )}
      </FormField>

      <FormField label="Password" required error={errors.adminPassword?.message}>
        {(id) => (
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.adminPassword)}
            {...register('adminPassword')}
          />
        )}
      </FormField>
    </form>
  )
}

export function NewTenantFormFooter({
  formId,
  saving,
  onCancel,
}: {
  formId: string
  saving: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" form={formId} variant="primary" loading={saving}>
        Create tenant
      </Button>
    </div>
  )
}
