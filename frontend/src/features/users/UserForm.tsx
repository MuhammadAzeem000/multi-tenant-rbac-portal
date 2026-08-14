import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { tenantsApi } from '@/api/tenants.api'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types/user'

const emailLocalPartSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(64)
  .regex(/^[a-zA-Z0-9._%+-]+$/, 'Only letters, numbers, and . _ % + - are allowed')

const baseFields = {
  name: z.string().trim().min(1, 'Name is required').max(150),
  username: z.string().trim().min(1, 'Username is required').max(100),
  emailLocalPart: emailLocalPartSchema,
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  jobTitle: z.string().trim().max(150).optional().or(z.literal('')),
  employeeCode: z.string().trim().max(100).optional().or(z.literal('')),
}

const createUserFormSchema = z.object({
  ...baseFields,
  password: z.string().min(8, 'At least 8 characters').max(255),
})

const editUserFormSchema = z.object({
  ...baseFields,
  password: z
    .string()
    .max(255)
    .refine((value) => value === '' || value.length >= 8, { message: 'At least 8 characters' }),
})

export type UserFormValues = z.infer<typeof createUserFormSchema>

interface UserFormProps {
  formId: string
  mode: 'create' | 'edit'
  defaultValues?: User
  onSubmit: (values: UserFormValues) => void
}

function emailLocalPartOf(email: string): string {
  return email.split('@')[0] ?? ''
}

export function UserForm({ formId, mode, defaultValues, onSubmit }: UserFormProps) {
  const tenantId = useAuthStore((state) => state.user?.tenantId ?? '')
  const tenantQuery = useQuery({
    queryKey: ['tenants', tenantId],
    queryFn: () => tenantsApi.get(tenantId),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  })
  const domain = tenantQuery.data?.domain

  const schema = mode === 'create' ? createUserFormSchema : editUserFormSchema
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      username: defaultValues?.username ?? '',
      emailLocalPart: defaultValues ? emailLocalPartOf(defaultValues.email) : '',
      phone: defaultValues?.phone ?? '',
      jobTitle: defaultValues?.jobTitle ?? '',
      employeeCode: defaultValues?.employeeCode ?? '',
      password: '',
    },
  })

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name,
        username: defaultValues.username,
        emailLocalPart: emailLocalPartOf(defaultValues.email),
        phone: defaultValues.phone ?? '',
        jobTitle: defaultValues.jobTitle ?? '',
        employeeCode: defaultValues.employeeCode ?? '',
        password: '',
      })
    }
  }, [defaultValues, reset])

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
      <FormField label="Full name" required error={errors.name?.message}>
        {(id) => <Input id={id} invalid={Boolean(errors.name)} {...register('name')} />}
      </FormField>
      <FormField label="Username" required error={errors.username?.message}>
        {(id) => <Input id={id} invalid={Boolean(errors.username)} {...register('username')} />}
      </FormField>
      <FormField
        label="Email"
        required
        hint="The domain is fixed to your organization's domain."
        error={errors.emailLocalPart?.message}
      >
        {(id) => (
          <div className="flex">
            <Input
              id={id}
              invalid={Boolean(errors.emailLocalPart)}
              className="rounded-r-none"
              {...register('emailLocalPart')}
            />
            <span className="inline-flex items-center whitespace-nowrap rounded-r-md border border-l-0 border-slate-300 bg-slate-50 px-2.5 text-sm text-slate-500">
              @{domain ?? '…'}
            </span>
          </div>
        )}
      </FormField>
      <FormField
        label={mode === 'create' ? 'Password' : 'New password'}
        required={mode === 'create'}
        hint={mode === 'edit' ? 'Leave blank to keep the current password.' : undefined}
        error={errors.password?.message}
      >
        {(id) => (
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.password)}
            {...register('password')}
          />
        )}
      </FormField>
      <FormField label="Phone" error={errors.phone?.message}>
        {(id) => <Input id={id} invalid={Boolean(errors.phone)} {...register('phone')} />}
      </FormField>
      <FormField label="Job title" error={errors.jobTitle?.message}>
        {(id) => <Input id={id} invalid={Boolean(errors.jobTitle)} {...register('jobTitle')} />}
      </FormField>
      <FormField label="Employee code" error={errors.employeeCode?.message}>
        {(id) => <Input id={id} invalid={Boolean(errors.employeeCode)} {...register('employeeCode')} />}
      </FormField>
    </form>
  )
}

export function UserFormFooter({
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
        Save
      </Button>
    </div>
  )
}
