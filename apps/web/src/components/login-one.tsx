import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginOne() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        setLoading(false)

        if (authError) {
            setError(authError.message)
            return
        }

        navigate('/')
    }

    return (
        <section className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">TransitWatch</h1>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">Sign in</h2>
                </div>

                <div className="rounded-2xl border border-border p-8">
                    {error && (
                        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                                Email
                            </Label>
                            <Input
                                type="email"
                                required
                                id="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                                Password
                            </Label>
                            <Input
                                type="password"
                                required
                                id="password"
                                placeholder="Your password"
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            disabled={loading}>
                            {loading ? 'Signing in...' : 'Continue'}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-medium text-primary hover:underline">
                            Create account
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}
