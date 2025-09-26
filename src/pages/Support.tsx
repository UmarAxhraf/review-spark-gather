// import React, { useState, useEffect } from "react";
// import {
//   Mail,
//   MessageCircle,
//   HelpCircle,
//   ChevronDown,
//   ChevronUp,
//   Search,
//   BookOpen,
//   Video,
//   Phone,
//   Clock,
//   Users,
//   Star,
//   ArrowRight,
//   Zap,
//   Shield,
//   Heart,
// } from "lucide-react";

// interface FAQItem {
//   question: string;
//   answer: string;
//   category: string;
// }

// interface QuickAction {
//   icon: React.ReactNode;
//   title: string;
//   description: string;
//   action: () => void;
//   color: string;
// }

// const faqData: FAQItem[] = [
//   {
//     question: "How do I get started with my account?",
//     answer:
//       "Once you've signed up, you can access your dashboard immediately. Start by adding your first team members and setting up your company profile in the settings section. Our onboarding wizard will guide you through the essential setup steps.",
//     category: "Getting Started",
//   },
//   {
//     question: "How do I manage team members?",
//     answer:
//       "Navigate to the 'Team Members' section from your dashboard. You can add, edit, or remove team members, assign categories and tags, and manage their information. Bulk actions are available for managing multiple members at once.",
//     category: "Team Management",
//   },
//   {
//     question: "What are QR codes used for?",
//     answer:
//       "QR codes allow your customers to quickly access review forms and provide feedback. You can generate custom QR codes for different locations, departments, or campaigns. Track scan analytics and customize landing pages for each QR code.",
//     category: "Features",
//   },
//   {
//     question: "How do I view analytics and reports?",
//     answer:
//       "Access the Analytics section to view detailed insights about your reviews, team performance, and customer feedback trends. You can also export reports for further analysis, set up automated reports, and create custom dashboards.",
//     category: "Analytics",
//   },
//   {
//     question: "What subscription plans are available?",
//     answer:
//       "We offer flexible subscription plans to suit different business needs. Visit the Home page or Profile page to view available plans and upgrade options. We offer 7-day free trial with full access to features. No credit card required",
//     category: "Billing",
//   },
//   {
//     question: "How do I reset my password?",
//     answer:
//       "Click on 'Forgot Password' on the login page and enter your email address. You'll receive instructions to reset your password via email within minutes. Make sure to check your spam folder if you don't see the email.",
//     category: "Account",
//   },
//   {
//     question: "Is my data secure?",
//     answer:
//       "Yes, we use enterprise-grade security with 256-bit SSL encryption, regular security audits, and SOC 2 compliance. Your data is backed up daily and stored in secure, geographically distributed data centers.",
//     category: "Security",
//   },
//   {
//     question: "Can I integrate with other tools?",
//     answer:
//       "Yes, we offer integrations with popular tools like Google My Business, Tripadvisor, Trustpilot, Microsoft Teams, and more. Check our integrations page for the full list of available connections and setup instructions.",
//     category: "Integrations",
//   },
// ];

// const Support: React.FC = () => {
//   const [openItems, setOpenItems] = useState<number[]>([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState("All");
//   const [isVisible, setIsVisible] = useState(false);

//   useEffect(() => {
//     setIsVisible(true);
//   }, []);

//   const categories = [
//     "All",
//     ...Array.from(new Set(faqData.map((faq) => faq.category))),
//   ];

//   const filteredFAQs = faqData.filter((faq) => {
//     const matchesSearch =
//       faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesCategory =
//       selectedCategory === "All" || faq.category === selectedCategory;
//     return matchesSearch && matchesCategory;
//   });

//   const toggleItem = (index: number) => {
//     setOpenItems((prev) =>
//       prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
//     );
//   };

//   const quickActions: QuickAction[] = [
//     {
//       icon: <Video className="h-6 w-6" />,
//       title: "Video Tutorials",
//       description: "Watch step-by-step guides",
//       action: () => console.log("Open tutorials"),
//       color: "from-purple-500 to-pink-500",
//     },
//     {
//       icon: <BookOpen className="h-6 w-6" />,
//       title: "Documentation",
//       description: "Detailed feature guides",
//       action: () => console.log("Open docs"),
//       color: "from-blue-500 to-cyan-500",
//     },
//     {
//       icon: <Users className="h-6 w-6" />,
//       title: "Community",
//       description: "Connect with other users",
//       action: () => console.log("Open community"),
//       color: "from-green-500 to-emerald-500",
//     },
//   ];

//   const handleContactSupport = () => {
//     window.location.href =
//       "mailto:support@syncreviews.com?subject=Support Request";
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
//       {/* Animated Background Elements */}
//       <div className="absolute inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
//         <div
//           className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl"
//           style={{ animationDelay: "1s", animation: "pulse 2s infinite" }}
//         />
//         <div
//           className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-br from-green-400/20 to-cyan-400/20 rounded-full blur-3xl"
//           style={{ animationDelay: "2s", animation: "pulse 2s infinite" }}
//         />
//       </div>

//       {/* Hero Section */}
//       <div className="relative">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
//           <div
//             className={`text-center transition-all duration-1000 ${
//               isVisible
//                 ? "translate-y-0 opacity-100"
//                 : "translate-y-10 opacity-0"
//             }`}
//             style={{
//               transform: isVisible ? "translateY(0)" : "translateY(40px)",
//               opacity: isVisible ? 1 : 0,
//             }}
//           >
//             <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-blue-200/50">
//               <Heart className="h-4 w-4 text-red-500 animate-pulse" />
//               <span className="text-sm font-medium text-gray-700">
//                 We're here to help 24/7
//               </span>
//             </div>

//             <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
//               Support Center
//             </h1>

//             <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
//               Get instant answers, explore resources, or connect with our expert
//               support team. We're committed to your success.
//             </p>

//             {/* Search Bar */}
//             <div className="max-w-2xl mx-auto mb-8">
//               <div className="relative">
//                 <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
//                 <input
//                   type="text"
//                   placeholder="Search for answers..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
//                 />
//               </div>
//             </div>

//             {/* Quick Actions */}
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
//               {quickActions.map((action, index) => (
//                 <div
//                   key={index}
//                   onClick={action.action}
//                   className={`group relative overflow-hidden bg-gradient-to-br ${action.color} p-6 rounded-2xl cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}
//                 >
//                   <div className="relative z-10">
//                     <div className="text-white mb-3">{action.icon}</div>
//                     <h3 className="text-lg font-bold text-white mb-1">
//                       {action.title}
//                     </h3>
//                     <p className="text-white/90 text-sm">
//                       {action.description}
//                     </p>
//                   </div>
//                   <div className="absolute inset-0 bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
//                   <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-white/70 transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
//         <div className="grid gap-12 lg:grid-cols-4">
//           {/* FAQ Section */}
//           <div className="lg:col-span-3">
//             <div className="mb-8">
//               <h2 className="text-3xl font-bold text-gray-900 mb-4">
//                 Frequently Asked Questions
//               </h2>

//               {/* Category Filter */}
//               {/* <div className="flex flex-wrap gap-2 mb-8">
//                 {categories.map((category) => (
//                   <button
//                     key={category}
//                     onClick={() => setSelectedCategory(category)}
//                     className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
//                       selectedCategory === category
//                         ? "bg-blue-600 text-white shadow-lg transform scale-105"
//                         : "bg-white/80 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
//                     }`}
//                   >
//                     {category}
//                   </button>
//                 ))}
//               </div> */}
//             </div>

//             <div className="space-y-4">
//               {filteredFAQs.map((faq, index) => {
//                 const isOpen = openItems.includes(index);
//                 return (
//                   <div
//                     key={index}
//                     className={`group bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
//                       isOpen ? "shadow-xl border-blue-200" : ""
//                     }`}
//                   >
//                     <button
//                       onClick={() => toggleItem(index)}
//                       className="w-full p-6 text-left hover:bg-gray-50/50 transition-all duration-300"
//                     >
//                       <div className="flex items-center justify-between">
//                         <div className="flex-1">
//                           <div className="flex items-center gap-3 mb-2">
//                             <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
//                               {faq.category}
//                             </span>
//                           </div>
//                           <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
//                             {faq.question}
//                           </h3>
//                         </div>
//                         <div
//                           className={`ml-4 transform transition-transform duration-300 ${
//                             isOpen ? "rotate-180" : ""
//                           }`}
//                         >
//                           <ChevronDown className="h-5 w-5 text-gray-500" />
//                         </div>
//                       </div>
//                     </button>

//                     {isOpen && (
//                       <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
//                         <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border-l-4 border-blue-500">
//                           <p className="text-gray-700 leading-relaxed">
//                             {faq.answer}
//                           </p>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>

//             {filteredFAQs.length === 0 && (
//               <div className="text-center py-12">
//                 <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50">
//                   <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                   <h3 className="text-xl font-semibold text-gray-900 mb-2">
//                     No results found
//                   </h3>
//                   <p className="text-gray-600 mb-6">
//                     Try adjusting your search terms or browse different
//                     categories.
//                   </p>
//                   <button
//                     onClick={() => {
//                       setSearchTerm("");
//                       setSelectedCategory("All");
//                     }}
//                     className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-300"
//                   >
//                     Clear filters
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Contact Sidebar */}
//           <div className="lg:col-span-1">
//             <div className="sticky top-8 space-y-6">
//               {/* Primary Contact Card */}
//               <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-2xl">
//                 <div className="flex items-center gap-3 mb-4">
//                   <MessageCircle className="h-6 w-6" />
//                   <h3 className="text-xl font-bold">Need Personal Help?</h3>
//                 </div>
//                 <p className="text-blue-100 mb-6">
//                   Can't find what you're looking for? Our expert team is ready
//                   to assist you.
//                 </p>
//                 <button
//                   onClick={handleContactSupport}
//                   className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/30 transition-all duration-300 flex items-center justify-center gap-2"
//                 >
//                   <Mail className="h-4 w-4" />
//                   Contact Support
//                 </button>
//               </div>

//               {/* Contact Methods */}
//               <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
//                 <h3 className="font-bold text-gray-900 mb-4">Get in Touch</h3>
//                 <div className="space-y-4">
//                   <a
//                     href="mailto:support@syncreviews.com"
//                     className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors duration-300 group"
//                   >
//                     <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors duration-300">
//                       <Mail className="h-4 w-4 text-blue-600" />
//                     </div>
//                     <div>
//                       <div className="font-medium text-gray-900">
//                         Email Support
//                       </div>
//                       <div className="text-sm text-gray-600">
//                         support@syncreviews.com
//                       </div>
//                     </div>
//                   </a>

//                   <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
//                     <div className="bg-green-100 p-2 rounded-lg">
//                       <Clock className="h-4 w-4 text-green-600" />
//                     </div>
//                     <div>
//                       <div className="font-medium text-gray-900">
//                         Response Time
//                       </div>
//                       <div className="text-sm text-gray-600">
//                         Within 24 hours
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Status Card */}
//               <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
//                 <div className="flex items-center gap-2 mb-3">
//                   <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
//                   <h3 className="font-bold text-gray-900">System Status</h3>
//                 </div>
//                 <p className="text-sm text-gray-600 mb-4">
//                   All systems operational
//                 </p>
//                 <div className="flex items-center gap-2 text-sm">
//                   <Shield className="h-4 w-4 text-green-600" />
//                   <span className="text-green-700 font-medium">
//                     99.9% uptime
//                   </span>
//                 </div>
//               </div>

//               {/* Success Stories */}
//               <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50">
//                 <div className="flex items-center gap-2 mb-3">
//                   <Star className="h-5 w-5 text-amber-500 fill-current" />
//                   <h3 className="font-bold text-gray-900">Happy Customers</h3>
//                 </div>
//                 <p className="text-sm text-gray-600 mb-3">
//                   "The support team resolved my issue in minutes. Outstanding
//                   service!"
//                 </p>
//                 <div className="flex items-center gap-2 text-xs text-amber-700">
//                   <Zap className="h-3 w-3" />
//                   <span>10,000+ satisfied customers</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Support;

import React from "react";

const Support = () => {
  return (
    <div>
      <h1 className="text-center text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
        Support Center
      </h1>
    </div>
  );
};

export default Support;
