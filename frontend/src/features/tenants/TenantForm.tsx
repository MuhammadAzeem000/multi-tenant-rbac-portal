import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { Tenant } from '@/types/tenant'

const tenantFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  code: z.string().trim().max(50).optional().or(z.literal('')),
  email: z.string().trim().email('Invalid email').max(255).optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  websiteUrl: z.string().trim().url('Invalid URL').max(500).optional().or(z.literal('')),
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
      slug: defaultValues?.slug ?? '',
      code: defaultValues?.code ?? '',
      email: defaultValues?.email ?? '',
      phone: defaultValues?.phone ?? '',
      websiteUrl: defaultValues?.websiteUrl ?? '',
      description: defaultValues?.description ?? '',
    },
  })

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name,
        slug: defaultValues.slug,
        code: defaultValues.code ?? '',
        email: defaultValues.email ?? '',
        phone: defaultValues.phone ?? '',
        websiteUrl: defaultValues.websiteUrl ?? '',
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
        label="Slug"
        required
        hint="Used to sign in. Lowercase letters, numbers, and hyphens."
        error={errors.slug?.message}
      >
        {(id) => <Input id={id} invalid={Boolean(errors.slug)} {...register('slug')} />}
      </FormField>
      <FormField label="Code" error={errors.code?.message}>
        {(id) => <Input id={id} invalid={Boolean(errors.code)} {...register('code')} />}
      </FormField>
      <FormField label="Email" error={errors.email?.message}>
        {(id) => <Input id={id} type="email" invalid={Boolean(errors.email)} {...register('email')} />}
      </FormField>
      <FormField label="Phone" error={errors.phone?.message}>
        {(id) => <Input id={id} invalid={Boolean(errors.phone)} {...register('phone')} />}
      </FormField>
      <FormField label="Website" error={errors.websiteUrl?.message}>
        {(id) => (
          <Input
            id={id}
            placeholder="https://example.com"
            invalid={Boolean(errors.websiteUrl)}
            {...register('websiteUrl')}
          />
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
