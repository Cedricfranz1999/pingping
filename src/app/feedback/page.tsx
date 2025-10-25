// ~/src/app/feedback/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  CheckCircle,
  MessageSquare,
  User,
  Mail,
  MapPin,
  Phone,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { api } from "~/trpc/react";

// shadcn/ui imports
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useToast } from "~/components/ui/use-toast";

export default function FeedbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    contact: "",
    feedback: "",
    star: 0,
  });
  const [hoverStar, setHoverStar] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const createFeedback = api.feedback.create.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });
      setTimeout(() => router.push("/"), 3000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.star === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating before submitting.",
        variant: "destructive",
      });
      return;
    }
    createFeedback.mutate(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const renderStars = () => {
    return [...Array(5)].map((_, i) => {
      const ratingValue = i + 1;
      return (
        <motion.button
          key={i}
          type="button"
          className="p-2 transition-transform hover:scale-110"
          onClick={() => setFormData({ ...formData, star: ratingValue })}
          onMouseEnter={() => setHoverStar(ratingValue)}
          onMouseLeave={() => setHoverStar(0)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Star
            className={`h-10 w-10 transition-all duration-200 ${
              (hoverStar || formData.star) >= ratingValue
                ? "fill-yellow-400 text-yellow-400 drop-shadow-lg"
                : "text-gray-300 hover:text-gray-400"
            }`}
          />
        </motion.button>
      );
    });
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  if (isSubmitted) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-orange-50 bg-cover bg-fixed bg-no-repeat p-4"
        style={{ backgroundImage: "url('/background.png')" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Card className="w-full max-w-md border-0 bg-white/95 shadow-2xl backdrop-blur-sm">
            <CardHeader className="pb-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mb-4 flex justify-center"
              >
                <div className="relative">
                  <CheckCircle className="h-20 w-20 text-green-500" />
                  <div className="absolute inset-0 h-20 w-20 animate-ping rounded-full bg-green-500/20" />
                </div>
              </motion.div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                Thank You!
              </CardTitle>
              <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-[#f8610e]" />
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-lg text-gray-700">
                We appreciate you taking the time to share your experience with
                Pings Ping Tinapa.
              </p>
              <p className="text-sm text-gray-500">
                Your feedback helps us serve you better!
              </p>
              <div className="pt-4">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-[#f8610e]" />
                  <span>Redirecting to homepage...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-orange-50 bg-cover bg-fixed bg-no-repeat"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-50 border-b border-[#f8610e]/10 bg-white/80 backdrop-blur-sm"
      >
        <div className="px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <motion.div
              className="flex items-center space-x-4"
              whileHover={{ scale: 1.02 }}
            >
              <div className="h-[70px] w-[70px] overflow-hidden rounded-full">
                <Image
                  alt="logo"
                  src="/logo.png"
                  width={500}
                  height={500}
                  className="h-full w-full"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Pings Ping Tinapa
                </h1>
                <p className="text-sm text-gray-600">
                  Authentic Filipino Delicacy
                </p>
              </div>
            </motion.div>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="flex items-center space-x-2 border-[#f8610e] text-[#f8610e] transition-all duration-200 hover:bg-[#f8610e] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="mx-auto max-w-4xl"
        >
          {/* Hero Section */}
          <motion.div variants={fadeInUp} className="mb-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <MessageSquare className="h-16 w-16 text-[#f8610e]" />
                <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400">
                  <Star className="h-3 w-3 fill-current text-white" />
                </div>
              </div>
            </div>
            <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
              Share Your <span className="text-[#f8610e]">Experience</span>
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-gray-600">
              Your feedback helps us improve and continue serving the best
              tinapa in the Philippines
            </p>
            <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-[#f8610e]" />
          </motion.div>

          {/* Feedback Form */}
          <motion.div variants={fadeInUp}>
            <Card className="overflow-hidden border-0 bg-white/95 shadow-2xl backdrop-blur-sm">
              <div className="relative">
                {/* Decorative header gradient */}
                <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-[#f8610e] via-yellow-400 to-[#f8610e]" />

                <CardContent className="p-8 md:p-12">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Personal Information Grid */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <motion.div variants={fadeInUp} className="space-y-3">
                        <Label
                          htmlFor="name"
                          className="flex items-center space-x-2 text-lg font-semibold text-gray-700"
                        >
                          <User className="h-5 w-5 text-[#f8610e]" />
                          <span>Your Name</span>
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="h-14 rounded-xl border-2 border-gray-200 text-lg transition-all duration-200 focus:border-[#f8610e] focus:ring-4 focus:ring-[#f8610e]/20"
                          placeholder="Enter your full name"
                        />
                      </motion.div>

                      <motion.div variants={fadeInUp} className="space-y-3">
                        <Label
                          htmlFor="email"
                          className="flex items-center space-x-2 text-lg font-semibold text-gray-700"
                        >
                          <Mail className="h-5 w-5 text-[#f8610e]" />
                          <span>Email Address</span>
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="h-14 rounded-xl border-2 border-gray-200 text-lg transition-all duration-200 focus:border-[#f8610e] focus:ring-4 focus:ring-[#f8610e]/20"
                          placeholder="your.email@example.com"
                        />
                      </motion.div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <motion.div variants={fadeInUp} className="space-y-3">
                        <Label
                          htmlFor="address"
                          className="flex items-center space-x-2 text-lg font-semibold text-gray-700"
                        >
                          <MapPin className="h-5 w-5 text-[#f8610e]" />
                          <span>Address</span>
                        </Label>
                        <Input
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          required
                          className="h-14 rounded-xl border-2 border-gray-200 text-lg transition-all duration-200 focus:border-[#f8610e] focus:ring-4 focus:ring-[#f8610e]/20"
                          placeholder="Your complete address"
                        />
                      </motion.div>

                      <motion.div variants={fadeInUp} className="space-y-3">
                        <Label
                          htmlFor="contact"
                          className="flex items-center space-x-2 text-lg font-semibold text-gray-700"
                        >
                          <Phone className="h-5 w-5 text-[#f8610e]" />
                          <span>Contact Number</span>
                        </Label>
                        <Input
                          id="contact"
                          name="contact"
                          value={formData.contact}
                          onChange={handleChange}
                          required
                          className="h-14 rounded-xl border-2 border-gray-200 text-lg transition-all duration-200 focus:border-[#f8610e] focus:ring-4 focus:ring-[#f8610e]/20"
                          placeholder="+63 917 123 4567"
                        />
                      </motion.div>
                    </div>

                    {/* Rating Section */}
                    <motion.div
                      variants={fadeInUp}
                      className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 py-8 text-center"
                    >
                      <Label className="mb-6 block text-xl font-bold text-gray-800">
                        Rate Your Experience
                      </Label>
                      <div className="mb-4 flex justify-center">
                        {renderStars()}
                      </div>
                      <motion.p
                        key={formData.star}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-lg font-medium"
                      >
                        {formData.star === 0 && (
                          <span className="text-gray-500">
                            Please select a rating
                          </span>
                        )}
                        {formData.star === 1 && (
                          <span className="text-red-500">
                            Poor - Well do better
                          </span>
                        )}
                        {formData.star === 2 && (
                          <span className="text-orange-500">
                            Fair - Room for improvement
                          </span>
                        )}
                        {formData.star === 3 && (
                          <span className="text-yellow-500">
                            Good - Thanks for the feedback
                          </span>
                        )}
                        {formData.star === 4 && (
                          <span className="text-blue-500">
                            Very Good - Were glad you enjoyed!
                          </span>
                        )}
                        {formData.star === 5 && (
                          <span className="text-green-500">
                            Excellent - You made our day!
                          </span>
                        )}
                      </motion.p>
                    </motion.div>

                    {/* Feedback Textarea */}
                    <motion.div variants={fadeInUp} className="space-y-4">
                      <Label
                        htmlFor="feedback"
                        className="text-lg font-semibold text-gray-700"
                      >
                        Tell us about your experience
                      </Label>
                      <Textarea
                        id="feedback"
                        name="feedback"
                        rows={6}
                        value={formData.feedback}
                        onChange={handleChange}
                        required
                        className="resize-none rounded-xl border-2 border-gray-200 text-lg transition-all duration-200 focus:border-[#f8610e] focus:ring-4 focus:ring-[#f8610e]/20"
                        placeholder="Share your thoughts about our products, service, or overall experience. Your detailed feedback helps us serve you better..."
                      />
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div variants={fadeInUp} className="pt-4">
                      <Button
                        type="submit"
                        disabled={createFeedback.isPending}
                        className="h-16 w-full transform rounded-xl bg-gradient-to-r from-[#f8610e] to-orange-600 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-[#f8610e]/90 hover:to-orange-600/90 hover:shadow-xl disabled:scale-100"
                      >
                        {createFeedback.isPending ? (
                          <div className="flex items-center space-x-3">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Submitting your feedback...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <MessageSquare className="h-6 w-6" />
                            <span>Submit Feedback</span>
                          </div>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </CardContent>
              </div>
            </Card>
          </motion.div>

          {/* Additional Information */}
          <motion.div variants={fadeInUp} className="mt-12 text-center">
            <div className="rounded-2xl border border-orange-100 bg-white/80 p-8 shadow-lg backdrop-blur-sm">
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                Why Your Feedback Matters
              </h3>
              <div className="grid gap-6 text-center md:grid-cols-3">
                <div className="space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                    <Star className="h-6 w-6 text-[#f8610e]" />
                  </div>
                  <h4 className="font-semibold text-gray-800">
                    Quality Improvement
                  </h4>
                  <p className="text-sm text-gray-600">
                    Help us maintain the highest standards for our products
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                    <MessageSquare className="h-6 w-6 text-[#f8610e]" />
                  </div>
                  <h4 className="font-semibold text-gray-800">
                    Better Service
                  </h4>
                  <p className="text-sm text-gray-600">
                    Your insights guide us to serve you better
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                    <CheckCircle className="h-6 w-6 text-[#f8610e]" />
                  </div>
                  <h4 className="font-semibold text-gray-800">
                    Customer Satisfaction
                  </h4>
                  <p className="text-sm text-gray-600">
                    We value every customers experience and opinion
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
