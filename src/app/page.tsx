"use client";
import {
  MapPin,
  Phone,
  Mail,
  Star,
  Award,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ImprovedHomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80, // Adjust for header height
        behavior: "smooth",
      });
    }
  };

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };
  const router = useRouter();

  // 12 products, all with fish.png as image temporarily
  const products = [
    {
      id: 1,
      name: "Premium Smoked Tinapa",
      description: "Handcrafted traditional smoked fish with rich flavor.",
      image: "/fish.png",
      price: "₱350 / pack",
    },
    {
      id: 2,
      name: "Tinapa Flakes",
      description: "Delicious smoked fish flakes perfect for rice toppings.",
      image: "/fish.png",
      price: "₱200 / jar",
    },
    {
      id: 3,
      name: "Spicy Tinapa",
      description: "Smoked fish with a spicy twist for adventurous taste buds.",
      image: "/fish.png",
      price: "₱380 / pack",
    },
    {
      id: 4,
      name: "Garlic Tinapa",
      description: "Smoked fish infused with garlic flavor.",
      image: "/fish.png",
      price: "₱360 / pack",
    },
    {
      id: 5,
      name: "Sweet Tinapa",
      description: "Sweet-smoked fish with a delicate aroma.",
      image: "/fish.png",
      price: "₱340 / pack",
    },
    {
      id: 6,
      name: "Extra Spicy Tinapa",
      description: "For those who like it hot and smoky.",
      image: "/fish.png",
      price: "₱400 / pack",
    },
    {
      id: 7,
      name: "Tinapa Belly Cuts",
      description: "Tender belly cuts of smoked fish.",
      image: "/fish.png",
      price: "₱370 / pack",
    },
    {
      id: 8,
      name: "Tinapa in Oil",
      description: "Smoked fish preserved in flavorful oil.",
      image: "/fish.png",
      price: "₱300 / jar",
    },
    {
      id: 9,
      name: "Salted Tinapa",
      description: "Traditional salted smoked fish.",
      image: "/fish.png",
      price: "₱330 / pack",
    },
    {
      id: 10,
      name: "Tinapa with Chili",
      description: "Smoked fish with chili flakes for a kick.",
      image: "/fish.png",
      price: "₱390 / pack",
    },
    {
      id: 11,
      name: "Smoked Tinapa Nuggets",
      description: "Bite-sized smoked fish nuggets.",
      image: "/fish.png",
      price: "₱280 / pack",
    },
    {
      id: 12,
      name: "Classic Tinapa",
      description: "The original smoked fish everyone loves.",
      image: "/fish.png",
      price: "₱350 / pack",
    },
  ];

  // 12 pasalubong items, all with pasalubonghd.png placeholder
  const pasalubongItems = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Pasalubong Item ${i + 1}`,
    description: "A perfect gift to bring home.",
    image: "/pasalubonghd.png",
    price: "₱150 / piece",
  }));

  return (
    <div
      className="min-h-screen bg-orange-50 bg-cover bg-fixed bg-no-repeat"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      {/* Your content here */}

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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
            <nav className="hidden items-center space-x-8 md:flex">
              <a
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("about");
                }}
                className="font-medium text-gray-700 transition-colors hover:text-[#f8610e]"
              >
                About
              </a>
              <a
                href="#products"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("products");
                }}
                className="font-medium text-gray-700 transition-colors hover:text-[#f8610e]"
              >
                Products
              </a>
              <a
                href="#pasalubong"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("pasalubong");
                }}
                className="font-medium text-gray-700 transition-colors hover:text-[#f8610e]"
              >
                Pasalubong
              </a>
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("contact");
                }}
                className="font-medium text-gray-700 transition-colors hover:text-[#f8610e]"
              >
                Contact
              </a>
              <Button
                className="rounded-full bg-[#f8610e] px-6 py-2 text-white hover:bg-[#f8610e]/90"
                onClick={() => router.push("/feedback")}
              >
                Feedback
              </Button>
            </nav>
          </div>
        </div>
      </motion.header>

      {/* Carousel Section */}
      <section className="relative overflow-hidden" id="about">
        <div className="relative h-screen">
          <AnimatePresence mode="wait">
            {/* Slide 1: Hero Section */}
            {currentSlide === 0 && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center px-6 py-24"
              >
                <div className="mx-auto w-full max-w-7xl">
                  <div className="grid items-center gap-16 lg:grid-cols-2">
                    <motion.div
                      variants={fadeInUp}
                      initial="initial"
                      animate="animate"
                      className="space-y-8"
                    >
                      <div className="space-y-4">
                        <motion.h2
                          className="text-5xl leading-tight font-bold text-gray-900 lg:text-7xl"
                          variants={fadeInUp}
                        >
                          Premium
                          <span className="block text-[#f8610e]">Tinapa</span>
                        </motion.h2>
                        <motion.p
                          className="max-w-lg text-xl leading-relaxed text-gray-600"
                          variants={fadeInUp}
                        >
                          Experience the authentic taste of traditional Filipino
                          smoked fish, crafted with time-honored techniques and
                          the finest ingredients.
                        </motion.p>
                      </div>
                      <motion.div
                        variants={fadeInUp}
                        className="flex flex-col gap-4 sm:flex-row"
                      >
                        <Button
                          size="lg"
                          className="rounded-full bg-[#f8610e] px-8 py-4 text-lg font-semibold text-white hover:bg-[#f8610e]/90"
                        >
                          Shop Now
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          className="rounded-full border-[#f8610e] bg-transparent px-8 py-4 text-lg font-semibold text-[#f8610e] hover:bg-[#f8610e] hover:text-white"
                        >
                          Learn More
                        </Button>
                      </motion.div>
                      <motion.div
                        variants={fadeInUp}
                        className="grid grid-cols-3 gap-8 pt-8"
                      >
                        <div className="text-center">
                          <div className="text-3xl font-bold text-[#f8610e]">
                            25+
                          </div>
                          <div className="text-sm font-medium text-gray-600">
                            Years Experience
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-[#f8610e]">
                            1000+
                          </div>
                          <div className="text-sm font-medium text-gray-600">
                            Happy Customers
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-[#f8610e]">
                            100%
                          </div>
                          <div className="text-sm font-medium text-gray-600">
                            Natural
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                    <motion.div variants={fadeInUp} className="relative">
                      <div className="relative h-[500px] overflow-hidden rounded-3xl bg-white shadow-2xl lg:h-[500px]">
                        <Image
                          className="rounded-3xl bg-[#6d2803] p-5"
                          src="/aboutUS5.png"
                          alt="Premium Tinapa"
                          fill
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Slide 2: About Us Section */}
            {currentSlide === 1 && (
              <motion.div
                key="about"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center bg-white px-6 py-24"
              >
                <div className="mx-auto w-full max-w-7xl">
                  <div className="grid items-center gap-16 lg:grid-cols-2">
                    <motion.div
                      variants={fadeInUp}
                      initial="initial"
                      animate="animate"
                      className="space-y-8"
                    >
                      <div className="space-y-6">
                        <motion.h2
                          className="text-4xl font-bold text-gray-900 lg:text-5xl"
                          variants={fadeInUp}
                        >
                          About{" "}
                          <span className="text-[#f8610e]">
                            Pings Ping Tinapa
                          </span>
                        </motion.h2>
                        <motion.p
                          className="text-lg leading-relaxed text-gray-600"
                          variants={fadeInUp}
                        >
                          For over 25 years, Pings Ping Tinapa has been crafting
                          authentic Filipino smoked fish using traditional
                          methods passed down through generations. Our
                          commitment to quality and authenticity has made us a
                          beloved name in Filipino cuisine.
                        </motion.p>
                        <motion.p
                          className="text-lg leading-relaxed text-gray-600"
                          variants={fadeInUp}
                        >
                          We source only the freshest fish from local fishermen
                          and use time-honored smoking techniques to create the
                          perfect balance of flavor and aroma. Every piece of
                          tinapa is carefully prepared with love and dedication
                          to preserve the authentic taste of this Filipino
                          delicacy.
                        </motion.p>
                      </div>

                      <motion.div
                        variants={fadeInUp}
                        className="grid grid-cols-2 gap-8"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <Award className="h-6 w-6 text-[#f8610e]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Premium Quality
                            </h4>
                            <p className="text-sm text-gray-600">
                              Hand-selected ingredients
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <Users className="h-6 w-6 text-[#f8610e]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Family Business
                            </h4>
                            <p className="text-sm text-gray-600">
                              Three generations strong
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <Clock className="h-6 w-6 text-[#f8610e]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Traditional Methods
                            </h4>
                            <p className="text-sm text-gray-600">
                              Time-tested processes
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <Star className="h-6 w-6 text-[#f8610e]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Authentic Taste
                            </h4>
                            <p className="text-sm text-gray-600">
                              Original Filipino flavors
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="relative">
                      <div className="relative h-[600px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#f8610e]/5 to-[#f8610e]/20 shadow-2xl">
                        <Image
                          src="/aboutUs.png"
                          alt="About Pings Ping Tinapa"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                      </div>
                      {/* Decorative elements */}
                      <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-[#f8610e]/20 blur-xl" />
                      <div className="absolute -top-6 -left-6 h-32 w-32 rounded-full bg-[#f8610e]/10 blur-xl" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Slide 3: Our Story & Heritage */}
            {currentSlide === 2 && (
              <motion.div
                key="heritage"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center bg-gradient-to-br from-orange-50 to-orange-100 px-6 py-24"
              >
                <div className="mx-auto w-full max-w-7xl">
                  <div className="grid items-center gap-16 lg:grid-cols-2">
                    <motion.div
                      variants={fadeInUp}
                      initial="initial"
                      animate="animate"
                      className="space-y-8"
                    >
                      <div className="space-y-6">
                        <motion.h2
                          className="text-4xl font-bold text-gray-900 lg:text-5xl"
                          variants={fadeInUp}
                        >
                          Our <span className="text-[#f8610e]">Heritage</span>
                        </motion.h2>
                        <motion.p
                          className="text-lg leading-relaxed text-gray-600"
                          variants={fadeInUp}
                        >
                          From humble beginnings in a small coastal town, our
                          familys passion for creating the perfect tinapa has
                          been passed down through three generations. Each
                          recipe tells a story of dedication, tradition, and
                          love for Filipino culinary heritage.
                        </motion.p>
                        <motion.p
                          className="text-lg leading-relaxed text-gray-600"
                          variants={fadeInUp}
                        >
                          Today, we continue to honor our ancestors legacy while
                          embracing modern techniques to bring you the finest
                          smoked fish products. Every bite connects you to our
                          rich cultural heritage and the timeless flavors of the
                          Philippines.
                        </motion.p>
                      </div>

                      <motion.div variants={fadeInUp} className="space-y-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <span className="text-lg font-bold text-[#f8610e]">
                              1
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Traditional Smoking Process
                            </h4>
                            <p className="text-sm text-gray-600">
                              Using coconut husks and native wood for authentic
                              flavor
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <span className="text-lg font-bold text-[#f8610e]">
                              2
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Fresh Local Catch
                            </h4>
                            <p className="text-sm text-gray-600">
                              Sourced daily from trusted local fishermen
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <span className="text-lg font-bold text-[#f8610e]">
                              3
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Family Recipe
                            </h4>
                            <p className="text-sm text-gray-600">
                              Secret blend of spices perfected over generations
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="relative">
                      <div className="relative h-[600px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#f8610e]/5 to-[#f8610e]/20 shadow-2xl">
                        <Image
                          src="/aboutUs4.png"
                          alt="Our Heritage - Pings Ping Tinapa"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                      </div>
                      {/* Decorative elements */}
                      <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-[#f8610e]/20 blur-xl" />
                      <div className="absolute -top-6 -left-6 h-32 w-32 rounded-full bg-[#f8610e]/10 blur-xl" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-6 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute top-1/2 right-6 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
          >
            <ChevronRight className="h-6 w-6 text-gray-700" />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 space-x-3">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-3 w-3 rounded-full transition-all duration-300 ${
                  currentSlide === index
                    ? "scale-125 bg-[#f8610e]"
                    : "bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Products Showcase */}
      <section id="products" className="mx-auto max-w-7xl px-6 py-16">
        <h3 className="mb-12 text-center text-4xl font-bold text-gray-900">
          Our Products
        </h3>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(({ id, name, description, image, price }) => (
            <Card
              key={id}
              className="overflow-hidden rounded-2xl px-4 shadow-lg"
            >
              <div className="relative h-64 w-full">
                <Image
                  src={image || "/placeholder.svg"}
                  alt={name}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              <CardContent className="space-y-2 p-6">
                <h4 className="text-lg font-semibold text-gray-900">{name}</h4>
                <p className="text-gray-600">{description}</p>
                <p className="mt-3 font-bold text-[#f8610e]">{price}</p>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("inquire");
                  }}
                  className="mt-4 w-full rounded-full bg-[#f8610e] text-white hover:bg-[#f8610e]/90"
                >
                  Order now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pasalubong Section */}
      <section id="pasalubong" className="mx-auto max-w-7xl px-6 py-16">
        <h3 className="mb-12 text-center text-4xl font-bold text-gray-900">
          Pasalubong Gifts
        </h3>
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {pasalubongItems.map(({ id, name, description, image, price }) => (
            <Card
              key={id}
              className="overflow-hidden rounded-2xl px-4 shadow-lg"
            >
              <div className="relative h-64 w-full">
                <Image
                  src={image || "/placeholder.svg"}
                  alt={name}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <CardContent className="space-y-2 p-6">
                <h4 className="text-lg font-semibold text-gray-900">{name}</h4>
                <p className="text-gray-600">{description}</p>
                <p className="mt-3 font-bold text-[#f8610e]">{price}</p>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("inquire");
                  }}
                  className="mt-4 w-full rounded-full bg-[#f8610e] text-white hover:bg-[#f8610e]/90"
                >
                  Order now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="contact" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6" id="inquire">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2
              className="mb-4 text-4xl font-bold text-gray-900 lg:text-5xl"
              variants={fadeInUp}
            >
              Get In <span className="text-[#f8610e]">Touch</span>
            </motion.h2>
            <motion.p
              className="mx-auto mb-16 max-w-2xl text-lg text-gray-600"
              variants={fadeInUp}
            >
              Ready to experience authentic Filipino tinapa? Contact us today
              for orders, inquiries, or to learn more about our products.
            </motion.p>
          </motion.div>

          <div className="grid gap-12 lg:grid-cols-2">
            {/* Contact Information */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="space-y-8"
            >
              <motion.div variants={fadeInUp}>
                <h3 className="mb-6 text-2xl font-bold text-gray-900">
                  Contact Information
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                      <MapPin className="h-6 w-6 text-[#f8610e]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Address</h4>
                      <p className="text-gray-600">
                        Brgy Matobato,
                        <br />
                        Calbayog City Samar purok 2
                        <br />
                        Philippines
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                      <Phone className="h-6 w-6 text-[#f8610e]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Phone</h4>
                      <p className="text-gray-600">
                        +63 32 123 4567
                        <br />
                        +63 917 123 4567 (Mobile)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                      <Mail className="h-6 w-6 text-[#f8610e]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Email</h4>
                      <p className="text-gray-600">
                        info@pingspingtinapa.com
                        <br />
                        orders@pingspingtinapa.com
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                      <Clock className="h-6 w-6 text-[#f8610e]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Business Hours
                      </h4>
                      <p className="text-gray-600">
                        Monday - Saturday: 8:00 AM - 6:00 PM
                        <br />
                        Sunday: 9:00 AM - 4:00 PM
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              <Card className="overflow-hidden rounded-2xl shadow-lg">
                <CardContent className="p-8">
                  <h3 className="mb-6 text-2xl font-bold text-gray-900">
                    Send us a Message
                  </h3>
                  <form className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="firstName"
                          className="mb-2 block text-sm font-medium text-gray-700"
                        >
                          First Name
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="lastName"
                          className="mb-2 block text-sm font-medium text-gray-700"
                        >
                          Last Name
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none"
                        placeholder="john.doe@example.com"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none"
                        placeholder="+63 917 123 4567"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="subject"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none"
                        placeholder="Product Inquiry"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none"
                        placeholder="Tell us about your inquiry or order requirements..."
                      ></textarea>
                    </div>

                    <Button className="w-full rounded-full bg-[#f8610e] py-3 text-lg font-semibold text-white hover:bg-[#f8610e]/90">
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="mb-4 flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]">
                  <span className="text-lg font-bold text-white">P</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Pings Ping Tinapa</h3>
                  <p className="text-gray-400">Authentic Filipino Delicacy</p>
                </div>
              </div>
              <p className="mb-4 text-gray-400">
                Preserving the authentic taste of Filipino tinapa for over 25
                years. Made with love, served with pride.
              </p>
              <div className="flex space-x-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 bg-transparent text-gray-400 hover:bg-[#f8610e] hover:text-white"
                >
                  Facebook
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 bg-transparent text-gray-400 hover:bg-[#f8610e] hover:text-white"
                >
                  Instagram
                </Button>
              </div>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#about" className="hover:text-[#f8610e]">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#products" className="hover:text-[#f8610e]">
                    Products
                  </a>
                </li>
                <li>
                  <a href="#pasalubong" className="hover:text-[#f8610e]">
                    Pasalubong
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-[#f8610e]">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Contact Info</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Cebu City, Philippines</li>
                <li>+63 32 123 4567</li>
                <li>info@pingspingtinapa.com</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Pings Ping Tinapa. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
