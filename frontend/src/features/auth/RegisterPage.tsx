import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldHalf } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useRegister } from '@/hooks/useAuth'

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const registerSchema = z
  .object({
    tenantName: z.string().trim().min(1, 'Organization name is required').max(150),
    tenantSlug: z
      .string()
      .trim()
      .min(1, 'Organization slug is required')
      .max(100)
      .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
    adminName: z.string().trim().min(1, 'Your name is required').max(150),
    adminUsername: z.string().trim().min(1, 'Username is required').max(100),
    adminEmail: z.string().trim().min(1, 'Email is required').email('Invalid email').max(255),
    adminPassword: z.string().min(8, 'At least 8 characters').max(255),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const register = useRegister()
  const [slugTouched, setSlugTouched] = useState(false)
  const {
    register: registerField,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  const tenantName = watch('tenantName')

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ShieldHalf className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-base font-semibold text-slate-900">Create your organization</h1>
          <p className="text-xs text-slate-500">Sets up your tenant and your first admin account</p>
        </div>

        <form
          onSubmit={handleSubmit((values) =>
            register.mutate({
              tenantName: values.tenantName,
              tenantSlug: values.tenantSlug,
              adminName: values.adminName,
              adminUsername: values.adminUsername,
              adminEmail: values.adminEmail,
              adminPassword: values.adminPassword,
            }),
          )}
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          noValidate
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Organization</p>

          <FormField label="Organization name" required error={errors.tenantName?.message}>
            {(id) => (
              <Input
                id={id}
                placeholder="Acme Corp"
                invalid={Boolean(errors.tenantName)}
                {...registerField('tenantName', {
                  onChange: (e) => {
                    if (!slugTouched) setValue('tenantSlug', slugify(e.target.value))
                  },
                })}
              />
            )}
          </FormField>

          <FormField
            label="Organization slug"
            required
            hint="Used to sign in later. Lowercase letters, numbers, and hyphens."
            error={errors.tenantSlug?.message}
          >
            {(id) => (
              <Input
                id={id}
                placeholder={tenantName ? slugify(tenantName) : 'acme-corp'}
                invalid={Boolean(errors.tenantSlug)}
                {...registerField('tenantSlug', {
                  onChange: () => setSlugTouched(true),
                })}
              />
            )}
          </FormField>

          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Your admin account
          </p>

          <FormField label="Full name" required error={errors.adminName?.message}>
            {(id) => (
              <Input id={id} invalid={Boolean(errors.adminName)} {...registerField('adminName')} />
            )}
          </FormField>

          <FormField label="Username" required error={errors.adminUsername?.message}>
            {(id) => (
              <Input id={id} invalid={Boolean(errors.adminUsername)} {...registerField('adminUsername')} />
            )}
          </FormField>

          <FormField label="Email" required error={errors.adminEmail?.message}>
            {(id) => (
              <Input
                id={id}
                type="email"
                invalid={Boolean(errors.adminEmail)}
                {...registerField('adminEmail')}
              />
            )}
          </FormField>

          <FormField label="Password" required error={errors.adminPassword?.message}>
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                invalid={Boolean(errors.adminPassword)}
                {...registerField('adminPassword')}
              />
            )}
          </FormField>

          <FormField label="Confirm password" required error={errors.confirmPassword?.message}>
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                invalid={Boolean(errors.confirmPassword)}
                {...registerField('confirmPassword')}
              />
            )}
          </FormField>

          <Button type="submit" variant="primary" size="md" loading={register.isPending} className="mt-1 w-full">
            Create organization
          </Button>

          <p className="text-center text-xs text-slate-500">
            Already have an organization?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
