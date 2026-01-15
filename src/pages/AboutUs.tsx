import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/config';
import { 
  Utensils, 
  ArrowRight, 
  ArrowLeft,
  Linkedin, 
  Facebook, 
  Instagram, 
  Github,
  Mail,
  Send,
  Code2,
  Server,
  Heart,
  Target,
  Users,
  Sparkles,
  Loader2,
  CheckCircle2,
  Menu
} from 'lucide-react';

interface DeveloperCardProps {
  name: string;
  role: string;
  image: string;
  description: string;
  socials: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    github?: string;
  };
  delay?: number;
}

function DeveloperCard({ name, role, image, description, socials, delay = 0 }: DeveloperCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="group relative overflow-hidden bg-card hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-6 relative z-10">
          {/* Image Container */}
          <div className="relative mb-6 mx-auto w-40 h-40">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/50 animate-pulse" />
            <motion.div 
              className="absolute inset-1 rounded-full bg-card overflow-hidden"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src={image} 
                alt={name}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              />
            </motion.div>
            {/* Role Badge */}
            <motion.div 
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg"
              whileHover={{ scale: 1.1 }}
            >
              {role === 'Frontend Developer' ? (
                <span className="flex items-center gap-1">
                  <Code2 className="h-3 w-3" /> Frontend
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Server className="h-3 w-3" /> Backend
                </span>
              )}
            </motion.div>
          </div>

          {/* Info */}
          <div className="text-center space-y-3">
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {/* Social Icons */}
          <div className="flex justify-center gap-3 mt-6">
            {socials.linkedin && (
              <motion.a
                href={socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-muted hover:bg-[#0077B5] hover:text-white transition-all duration-300"
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <Linkedin className="h-5 w-5" />
              </motion.a>
            )}
            {socials.facebook && (
              <motion.a
                href={socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-muted hover:bg-[#1877F2] hover:text-white transition-all duration-300"
                whileHover={{ scale: 1.2, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
              >
                <Facebook className="h-5 w-5" />
              </motion.a>
            )}
            {socials.instagram && (
              <motion.a
                href={socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-muted hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#F77737] hover:text-white transition-all duration-300"
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <Instagram className="h-5 w-5" />
              </motion.a>
            )}
            {socials.github && (
              <motion.a
                href={socials.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-muted hover:bg-[#333] hover:text-white transition-all duration-300"
                whileHover={{ scale: 1.2, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
              >
                <Github className="h-5 w-5" />
              </motion.a>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AboutUs() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all fields before submitting.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Message Sent!',
          description: 'Thank you for your feedback. We\'ll get back to you soon.',
        });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const developers = [
    {
      name: 'John Doe',
      role: 'Frontend Developer',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
      description: 'Passionate about creating beautiful, responsive user interfaces with React and modern web technologies.',
      socials: {
        linkedin: 'https://linkedin.com/',
        facebook: 'https://facebook.com/',
        instagram: 'https://instagram.com/',
        github: 'https://github.com/'
      }
    },
    {
      name: 'Jane Smith',
      role: 'Backend Developer',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
      description: 'Expert in building scalable APIs and database architectures with Node.js and MongoDB.',
      socials: {
        linkedin: 'https://linkedin.com/',
        facebook: 'https://facebook.com/',
        instagram: 'https://instagram.com/',
        github: 'https://github.com/'
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">Mess Manager</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="gradient-primary">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex flex-col gap-4 mt-8">
                <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                  </Button>
                </Link>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full gradient-primary">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <motion.div 
          className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 5 }}
        />
        <motion.div 
          className="absolute bottom-10 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ repeat: Infinity, duration: 5 }}
        />
        
        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Heart className="w-4 h-4" />
              Meet the Team Behind Mess Manager
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              About <span className="text-primary">Us</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're a passionate team dedicated to simplifying mess management for hostels and shared living spaces. Our mission is to make meal tracking and expense management effortless.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: 'Simplicity', description: 'We believe in making complex things simple. Our platform is designed to be intuitive and easy to use.' },
              { icon: Users, title: 'Community', description: 'Built for communities, by understanding their needs. We listen and continuously improve.' },
              { icon: Sparkles, title: 'Innovation', description: 'Always pushing boundaries to bring you the best features and user experience.' }
            ].map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">Meet Our Developers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The talented individuals who brought Mess Manager to life
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {developers.map((dev, index) => (
              <DeveloperCard key={dev.name} {...dev} delay={index * 0.2} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Mail className="w-4 h-4" />
              Get in Touch
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Submit a Report</h2>
            <p className="text-muted-foreground">
              Found a bug? Have a suggestion? We'd love to hear from you!
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Your Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Bug Report / Feature Request / Feedback"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe your issue or suggestion in detail..."
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
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
