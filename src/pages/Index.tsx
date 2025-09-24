import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Star,
  Users,
  QrCode,
  TrendingUp,
  Bell,
  Shield,
  Loader2,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
// Fix: Use SubscriptionContext instead of DirectSubscriptionContext
import { useSubscription } from "@/contexts/SubscriptionContext";
// import { createDirectCheckout, PRICING_PLANS } from "@/lib/stripe-direct";

const Index = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  // Update to include the new method
  const { subscription, createSubscription, handlePlanSelection } = useSubscription();

  // Add useEffect to handle anchor scrolling
  useEffect(() => {
    // Check if URL has #pricing hash
    if (window.location.hash === "#pricing") {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        const pricingElement = document.getElementById("pricing");
        if (pricingElement) {
          pricingElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
    }
  }, []);

  const handlePlanSelect = async (planType: string) => {
    try {
      setLoadingPlan(planType);

      if (!user) {
        // Store the selected plan in sessionStorage to resume after login
        sessionStorage.setItem("selectedPlan", planType);
        // Redirect to signup instead of showing alert
        navigate("/signup");
        return;
      }

      // Fix: Use the authenticated createSubscription method
      await createSubscription(
        planType as "starter" | "professional" | "enterprise"
      );
    } catch (error) {
      console.error("Error creating checkout session:", error);
      alert("Failed to start checkout process. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  // Updated Stripe checkout handler function with conditional redirection
  const handleStripeCheckout = async (
    planType: "starter" | "professional" | "enterprise"
  ) => {
    try {
      setLoadingPlan(planType);

      if (!user) {
        // Store the selected plan in sessionStorage to resume after login
        sessionStorage.setItem("selectedPlan", planType);
        // Redirect to signup instead of showing alert
        navigate("/signup");
        return;
      }

      // Use the new method that handles conditional redirection
      await handlePlanSelection(planType);
    } catch (error) {
      console.error("Error handling plan selection:", error);
      alert("Failed to process your request. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const pricingPlans = [
    {
      name: "Review Starter",
      price: "$29",
      period: "/month",
      description:
        "Perfect for small businesses getting started with review collection",
      features: [
        "Up to 5 team members",
        "100 reviews per month",
        "Basic QR codes",
        "Email notifications",
        "Basic analytics",
      ],
      popular: false,
      planType: "starter" as const,
    },
    {
      name: "Review Pro",
      price: "$79",
      period: "/month",
      description: "Comprehensive review management for growing businesses",
      features: [
        "Up to 25 team members",
        "Unlimited reviews",
        "Custom QR codes",
        "SMS & email notifications",
        "Advanced analytics",
        "Google/Facebook integration",
        "Priority support",
      ],
      popular: true,
      planType: "professional" as const,
    },
    {
      name: "Review Enterprise",
      price: "$199",
      period: "/month",
      description: "Enterprise-grade review collection and management solution",
      features: [
        "Unlimited team members",
        "Unlimited reviews",
        "White-label solution",
        "API access",
        "Custom integrations",
        "Dedicated support",
        "Advanced reporting",
      ],
      popular: false,
      planType: "enterprise" as const,
    },
  ];

  const features = [
    {
      icon: <Users className="h-12 w-12 text-blue-600" />,
      title: "Team Collaboration",
      description:
        "Invite team members and manage review collection across your organization with role-based access controls.",
    },
    {
      icon: <QrCode className="h-12 w-12 text-blue-600" />,
      title: "Smart QR Codes",
      description:
        "Generate custom QR codes that direct customers to your review collection page with automatic tracking.",
    },
    {
      icon: <TrendingUp className="h-12 w-12 text-blue-600" />,
      title: "Analytics Dashboard",
      description:
        "Track review performance, customer sentiment, and team productivity with detailed analytics and reports.",
    },
    {
      icon: <Bell className="h-12 w-12 text-blue-600" />,
      title: "Smart Notifications",
      description:
        "Get instant alerts for new reviews, follow-ups needed, and important customer feedback across all channels.",
    },
    {
      icon: <Shield className="h-12 w-12 text-blue-600" />,
      title: "Review Moderation",
      description:
        "Advanced spam detection and content moderation tools to ensure authentic, high-quality customer reviews.",
    },
    {
      icon: <Star className="h-12 w-12 text-blue-600" />,
      title: "Multi-Platform Integration",
      description:
        "Seamlessly integrate with Google, Facebook, Yelp, and other major review platforms for comprehensive management.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ReviewPro</span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                // Show Profile section for logged-in users
                <div className="flex items-center space-x-4">
                  <Link to="/profile">
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-2"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button variant="ghost">Dashboard</Button>
                  </Link>
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              ) : (
                // Show Login and Get Started for non-authenticated users
                <>
                  <Link to="/login">
                    <Button variant="ghost">Login</Button>
                  </Link>
                  <Link to="/signup">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Collect Customer Reviews
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Like Never Before
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform your customer feedback collection with smart QR codes,
            automated follow-ups, and powerful analytics. Build trust and grow
            your business with authentic reviews.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard">
                <Button
                  size="lg"
                  className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 py-4 text-lg"
                  >
                    Watch Demo
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Collect Reviews
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful tools designed to help you gather authentic customer
              feedback and build lasting relationships
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the perfect plan for your business size and needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${
                  plan.popular ? "ring-2 ring-blue-600 shadow-2xl" : "shadow-lg"
                } hover:shadow-xl transition-shadow duration-300`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-center space-x-3"
                      >
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleStripeCheckout(plan.planType)}
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    disabled={loadingPlan === plan.planType}
                  >
                    {loadingPlan === plan.planType ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : user ? (
                      "Upgrade Plan"
                    ) : (
                      "Get Started"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Review Collection?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using ReviewPro to collect
            authentic customer reviews and build trust.
          </p>
          {user ? (
            <Link to="/dashboard">
              <Button
                size="lg"
                variant="secondary"
                className="px-8 py-4 text-lg"
              >
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="px-8 py-4 text-lg"
              >
                Start Your Free Trial Today
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ReviewPro</span>
          </div>
          <div className="text-center text-gray-400">
            <p>&copy; 2024 ReviewPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
