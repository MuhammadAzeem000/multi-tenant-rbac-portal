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

function domainify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

const registerSchema = z
  .object({
    tenantName: z.string().trim().min(1, 'Organization name is required').max(150),
    tenantDomain: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Organization domain is required')
      .max(255)
      .regex(domainRegex, 'Enter a valid domain, e.g. acme.com'),
    adminName: z.string().trim().min(1, 'Your name is required').max(150),
    adminEmailLocalPart: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email is required')
      .max(64)
      .regex(/^[a-zA-Z0-9._%+-]+$/, 'Only letters, numbers, and . _ % + - are allowed'),
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
  const [domainTouched, setDomainTouched] = useState(false)
  const {
    register: registerField,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  const tenantName = watch('tenantName')
  const tenantDomain = watch('tenantDomain')

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
              tenantDomain: values.tenantDomain,
              adminName: values.adminName,
              adminEmailLocalPart: values.adminEmailLocalPart,
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
                    if (!domainTouched) {
                      setValue('tenantDomain', `${domainify(e.target.value)}.com`)
                    }
                  },
                })}
              />
            )}
          </FormField>

          <FormField
            label="Organization domain"
            required
            hint="Every user's email in this organization will be @this domain. Also used to sign in."
            error={errors.tenantDomain?.message}
          >
            {(id) => (
              <Input
                id={id}
                placeholder={tenantName ? `${domainify(tenantName)}.com` : 'acme.com'}
                invalid={Boolean(errors.tenantDomain)}
                {...registerField('tenantDomain', {
                  onChange: () => setDomainTouched(true),
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

          <FormField
            label="Email"
            required
            hint="The domain is fixed to your organization's domain above."
            error={errors.adminEmailLocalPart?.message}
          >
            {(id) => (
              <div className="flex">
                <Input
                  id={id}
                  invalid={Boolean(errors.adminEmailLocalPart)}
                  className="rounded-r-none"
                  {...registerField('adminEmailLocalPart')}
                />
                <span className="inline-flex items-center whitespace-nowrap rounded-r-md border border-l-0 border-slate-300 bg-slate-50 px-2.5 text-sm text-slate-500">
                  @{tenantDomain || 'acme.com'}
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
