import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { Tenant } from '@/types/tenant'

const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

const tenantFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Domain is required')
    .max(255)
    .regex(domainRegex, 'Enter a valid domain, e.g. acme.com'),
  description: z.string().trim().optional().or(z.literal('')),
})

export type TenantFormValues = z.infer<typeof tenantFormSchema>

interface TenantFormProps {
  formId: string
  defaultValues?: Tenant
  onSubmit: (values: TenantFormValues) => void
}

export function TenantForm({ formId, defaultValues, onSubmit }: TenantFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      domain: defaultValues?.domain ?? '',
      description: defaultValues?.description ?? '',
    },
  })

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name,
        domain: defaultValues.domain,
        description: defaultValues.description ?? '',
      })
    }
  }, [defaultValues, reset])

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
      <FormField label="Name" required error={errors.name?.message}>
        {(id) => <Input id={id} invalid={Boolean(errors.name)} {...register('name')} />}
      </FormField>
      <FormField
        label="Domain"
        required
        hint="User emails in this organization are always @this domain."
        error={errors.domain?.message}
      >
        {(id) => (
          <Input id={id} placeholder="acme.com" invalid={Boolean(errors.domain)} {...register('domain')} />
        )}
      </FormField>
      <FormField label="Description" error={errors.description?.message}>
        {(id) => <Textarea id={id} invalid={Boolean(errors.description)} {...register('description')} />}
      </FormField>
    </form>
  )
}

export function TenantFormFooter({ formId, saving, onCancel }: { formId: string; saving: boolean; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" form={formId} variant="primary" loading={saving}>
        Save
      </Button>
    </div>
  )
}
