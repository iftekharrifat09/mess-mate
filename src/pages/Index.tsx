import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Utensils, ArrowRight, Users, Wallet, Shield, ClipboardList, Info } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">Mess Manager</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/about">
              <Button variant="ghost" className="gap-2">
                <Info className="h-4 w-4" />
                About Us
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/auth">
              <Button className="gradient-primary">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Simplify Your Mess Management
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Manage Your Mess{' '}
            <span className="text-primary">Effortlessly</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            A complete solution for managing meals, deposits, and expenses in your hostel or shared living space. Track everything with ease.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="gradient-primary">
                Start Managing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/join-mess">
              <Button size="lg" variant="outline">
                Join a Mess
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Powerful features to simplify your mess management workflow
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Utensils className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Meal Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Track breakfast, lunch, and dinner for every member with automatic calculations.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                  <Wallet className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Deposit Management</h3>
                <p className="text-sm text-muted-foreground">
                  Keep track of all deposits and automatically calculate member balances.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-warning" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Member Management</h3>
                <p className="text-sm text-muted-foreground">
                  Approve join requests, manage roles, and keep your mess organized.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-info" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Role-based access ensures only authorized users can make changes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-8">
            Create your mess and invite your members in minutes.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gradient-primary">
              Create Your Mess
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Utensils className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Mess Manager</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Mess Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
