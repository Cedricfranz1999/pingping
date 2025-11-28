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
import { SocialButtons } from "~/components/social-buttons";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { useState, useEffect, useMemo } from "react";
import { api } from "~/trpc/react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  const goToSlide = (index: number) => setCurrentSlide(index);

  const router = useRouter();

  // Product dialog state (unified grid)
  const [selectedProduct, setSelectedProduct] = useState<{
    id: number | string;
    name: string;
    description?: string | null;
    image?: string | null;
    price?: number | string;
    variants?: any[];
    baseName?: string;
  } | null>(null);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [showVariantList, setShowVariantList] = useState(true);
  const utils = api.useUtils();
  const rateMutation = api.product.rateProduct.useMutation({
    onSuccess: async () => {
      try {
        // Invalidate all ratings to refresh group and variant views
        await utils.product.getRatingsByProductIds.invalidate();
      } catch {}
    },
  });
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>("");

  // Fetch both lists via a single query to avoid DB pool timeouts
  const { data: homeLists, isLoading: loadingHomeLists } =
    api.product.getHomeLists.useQuery();

  const products = homeLists?.tinapa;
  const pasalubongItems = homeLists?.pasalubong;

  const allProducts = useMemo(
    () => [...(products ?? []), ...(pasalubongItems ?? [])],
    [products, pasalubongItems],
  );
  const loadingAll = loadingHomeLists;

  // Ratings: fetch for all product ids once
  const allProductIds = useMemo(() => (allProducts ?? []).map((p: any) => p.id as number), [allProducts]);
  const { data: ratingsMap } = api.product.getRatingsByProductIds.useQuery(
    { productIds: allProductIds },
    { enabled: allProductIds.length > 0 }
  );

  // Dialog helpers: group vs variant view and rating target
  const isGroupView = !!selectedProduct && selectedProduct.price === undefined;
  const groupDialogStats = useMemo(() => {
    if (!selectedProduct || !Array.isArray(selectedProduct.variants)) return { avg: 0, count: 0 };
    return computeGroupRating(selectedProduct.variants as any[]);
  }, [selectedProduct, computeGroupRating]);
  const ratingTargetId = useMemo(() => {
    if (!selectedProduct) return undefined as number | undefined;
    if (selectedProduct.price === undefined) {
      const v = (selectedProduct.variants ?? [])[0] as any;
      return v ? Number(v.id) : undefined;
    }
    return Number(selectedProduct.id);
  }, [selectedProduct]);

  function computeGroupRating(variants: any[]) {
    if (!ratingsMap) return { avg: 0, count: 0 };
    let total = 0;
    let count = 0;
    for (const v of variants) {
      const r = ratingsMap[v.id as number];
      if (r && r.count > 0) {
        total += r.average * r.count;
        count += r.count;
      }
    }
    return { avg: count > 0 ? total / count : 0, count };
  }

  const StarRow = ({ average, count }: { average: number; count?: number }) => {
    const stars = Array.from({ length: 5 }, (_, i) => {
      const fill = Math.max(0, Math.min(1, average - i)); // 0..1 per-star fill
      return fill;
    });
    const hasRatings = typeof count === "number" ? count > 0 : average > 0;
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="flex items-center">
          {stars.map((fill, idx) => (
            <div key={idx} className="relative h-4 w-4">
              <Star className="absolute inset-0 h-4 w-4 text-gray-300" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${Math.round(fill * 100)}%` }}
              >
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              </div>
            </div>
          ))}
        </div>
        {hasRatings ? (
          <>
            <span className="font-medium">{average.toFixed(1)}</span>
            {typeof count === "number" && <span className="text-gray-400">({count})</span>}
          </>
        ) : (
          <span className="text-gray-400">No ratings yet</span>
        )}
      </div>
    );
  };

  // Group products by Category -> Product Name (variants inside)
  const groupedByCategory = useMemo(() => {
    const categoriesMap = new Map<string, Map<string, any[]>>();
    for (const p of allProducts) {
      const catNames = (p as any).categories?.map((c: any) => c.category?.name).filter(Boolean) as string[];
      const names = catNames?.length ? catNames : ["Uncategorized"];
      for (const cat of names) {
        if (!categoriesMap.has(cat)) categoriesMap.set(cat, new Map());
        const byName = categoriesMap.get(cat)!;
        const key = (p as any).name?.trim().toLowerCase() ?? "";
        const arr = byName.get(key) ?? [];
        arr.push(p);
        byName.set(key, arr);
      }
    }
    // Convert to array [{category, items:[{name, variants:[]}, ...]}]
    return Array.from(categoriesMap.entries()).map(([category, byName]) => ({
      category,
      items: Array.from(byName.entries()).map(([nameKey, variants]) => ({
        name: (variants[0] as any)?.name ?? nameKey,
        variants,
      })),
    }));
  }, [allProducts]);

  // Category filter state (top buttons)
  const categoryList = useMemo(() => {
    const cats = Array.from(new Set(groupedByCategory.map((g) => g.category)));
    cats.sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
    return ["All", ...cats];
  }, [groupedByCategory]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [showAll, setShowAll] = useState(false);

  const catToId = (cat: string) => `cat-${String(cat).trim().toLowerCase().replace(/\s+/g, '-')}`;

  // Helpers to render product cards and sections
  const formatPHP = (amount: number) =>
    Number(amount || 0).toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });

  const renderProductCard = (name: string, variants: any[]) => {
    const sorted = variants
      .slice()
      .sort((a: any, b: any) => {
        // Prefer size order REGULAR < SMALL < MEDIUM < LARGE; fallback to price asc
        const order = { REGULAR: 0, SMALL: 1, MEDIUM: 2, LARGE: 3 } as Record<string, number>;
        const as = order[(a?.size || "").toUpperCase()] ?? 99;
        const bs = order[(b?.size || "").toUpperCase()] ?? 99;
        if (as !== bs) return as - bs;
        const ap = Number.parseFloat(a?.price ?? "0");
        const bp = Number.parseFloat(b?.price ?? "0");
        return (Number.isNaN(ap) ? 0 : ap) - (Number.isNaN(bp) ? 0 : bp);
      });
    const first = (sorted[0] as any) ?? (variants[0] as any);
    const groupDesc =
      (variants.find((v: any) => (v?.description ?? "").trim().length > 0)?.description as string | undefined) ??
      (first?.description ?? "");
    const prices = variants
      .map((v: any) => parseFloat(v.price))
      .filter((n: number) => !Number.isNaN(n));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const sizedVariants = variants.filter((v: any) => !!(v?.size && String(v.size).trim().length > 0));
    const shouldShowVariantHover = sizedVariants.length > 0;
    const groupStats = computeGroupRating(variants);
    return (
      <Card
        key={name}
        role="button"
        tabIndex={0}
        onClick={() => {
          setSelectedProduct({
            id: first?.id, // ensure numeric id for consistency
            name,
            description: groupDesc ?? "",
            image: first?.image, // show base product image (from first variant)
            price: undefined,
            variants,
            baseName: name,
          });
          setShowVariantList(true);
          setIsProductOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setSelectedProduct({
              id: first?.id, // ensure numeric id for consistency
              name,
              description: groupDesc ?? "",
              image: first?.image, // show base product image (from first variant)
              price: undefined,
              variants,
              baseName: name,
            });
            setShowVariantList(true);
            setIsProductOpen(true);
          }
        }}
        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl px-4 shadow-lg transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#f8610e]/40"
      >
        <div className="relative h-56 w-full">
          <Image src={first?.image || "/placeholder.svg"} alt={name} fill unoptimized className="object-cover" />
        </div>
        <CardContent className="flex flex-grow flex-col gap-3 p-6">
          <h4 className="text-xl font-bold text-gray-900 line-clamp-1">{name}</h4>
          <p className="text-sm leading-relaxed text-gray-600 line-clamp-3">{groupDesc ?? ""}</p>
          <StarRow average={groupStats.avg} count={groupStats.count} />
          <div className="text-lg font-semibold text-[#f8610e]">
            {prices.length === 0
              ? formatPHP(0)
              : prices.length > 1 && min !== max
              ? `${formatPHP(min)} - ${formatPHP(max)}`
              : formatPHP(prices[0] ?? 0)}
          </div>
          {/* Variants on hover removed by request; show on click only */}
        </CardContent>
      </Card>
    );
  };

  // Single-variant card (one card per product row/variant)
  const renderVariantCard = (v: any) => {
    const base = (v?.name ?? "").trim();
    const sizeLabel = v?.size ? String(v.size).charAt(0) + String(v.size).slice(1).toLowerCase() : "";
    const displayName = sizeLabel ? `${base} - ${sizeLabel}` : base;
    const priceNum = parseFloat(v?.price ?? 0);
    const priceText = formatPHP(Number.isNaN(priceNum) ? 0 : priceNum);
    const rating = ratingsMap?.[Number(v?.id)];
    // Find other variants with the same base name for dialog context
    const groupEntry = flatProductGroups.find((g) => (g.name ?? "").trim().toLowerCase() === base.toLowerCase());
    const dialogVariants = groupEntry?.variants ?? [v];
    return (
      <Card
        key={v.id}
        role="button"
        tabIndex={0}
        onClick={() => {
          setSelectedProduct({
            id: v.id,
            name: displayName,
            description: v.description ?? "",
            image: v.image,
            price: v.price,
            variants: dialogVariants,
            baseName: base,
          });
          setShowVariantList(true);
          setIsProductOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setSelectedProduct({
              id: v.id,
              name: displayName,
              description: v.description ?? "",
              image: v.image,
              price: v.price,
              variants: dialogVariants,
              baseName: base,
            });
            setShowVariantList(true);
            setIsProductOpen(true);
          }
        }}
        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl px-4 shadow-lg transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#f8610e]/40"
      >
        <div className="relative h-56 w-full">
          <Image src={v?.image || "/placeholder.svg"} alt={displayName} fill unoptimized className="object-cover" />
        </div>
        <CardContent className="flex flex-grow flex-col gap-3 p-6">
          <h4 className="text-xl font-bold text-gray-900 line-clamp-1">{base}</h4>
          <div className="flex items-center justify-between">
            {sizeLabel ? (
              <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">{sizeLabel}</span>
            ) : (
              <span />
            )}
            <span className="text-lg font-semibold text-[#f8610e]">{priceText}</span>
          </div>
          <p className="text-sm leading-relaxed text-gray-600 line-clamp-3">{v?.description ?? ""}</p>
          <StarRow average={rating?.average ?? 0} count={rating?.count ?? 0} />
        </CardContent>
      </Card>
    );
  };

  const showVariantsAsCards = false;
  const renderAllPreview = () => (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {showVariantsAsCards
        ? (allProducts ?? []).slice(0, 6).map((v: any) => renderVariantCard(v))
        : flatProductGroups
            .slice()
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
            .slice(0, 6)
            .map(({ name, variants }) => renderProductCard(name, variants))}
    </div>
  );

  const renderAllFull = () => {
    if (!showVariantsAsCards) {
      return (
        <div className="space-y-10">
          {groupedByCategory
            .slice()
            .sort((a, b) => (a.category || "").localeCompare(b.category || ""))
            .map((g) => (
              <div key={g.category} className="space-y-4" id={catToId(g.category)}>
                <h3 className="text-2xl font-bold text-[#6d2803]">{g.category}</h3>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items
                    .slice()
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map(({ name, variants }) => renderProductCard(name, variants))}
                </div>
              </div>
            ))}
        </div>
      );
    }
    // Variant-per-card, but still grouped by category
    return (
      <div className="space-y-10">
        {categoryList
          .filter((c) => c !== "All")
          .map((cat) => {
            const items = (allProducts ?? []).filter((p: any) => {
              const names = (p?.categories ?? [])
                .map((c: any) => c?.category?.name)
                .filter(Boolean) as string[];
              const list = names?.length ? names : ["Uncategorized"];
              return list.includes(cat);
            });
            return (
              <div key={cat} className="space-y-4" id={catToId(cat)}>
                <h3 className="text-2xl font-bold text-[#6d2803]">{cat}</h3>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((v: any) => renderVariantCard(v))}
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  const renderCategory = (cat: string) => {
    if (!showVariantsAsCards) {
      const group = groupedByCategory.find((g) => g.category === cat);
      if (!group) return null;
      return (
        <div className="space-y-4" id={catToId(cat)}>
          <h3 className="text-2xl font-bold text-[#6d2803]">{cat}</h3>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {group.items
              .slice()
              .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
              .map(({ name, variants }) => renderProductCard(name, variants))}
          </div>
        </div>
      );
    }
    // Variant-per-card rendering per category
    const items = (allProducts ?? []).filter((p: any) => {
      const names = (p?.categories ?? [])
        .map((c: any) => c?.category?.name)
        .filter(Boolean) as string[];
      const list = names?.length ? names : ["Uncategorized"];
      return list.includes(cat);
    });
    return (
      <div className="space-y-4" id={catToId(cat)}>
        <h3 className="text-2xl font-bold text-[#6d2803]">{cat}</h3>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v: any) => renderVariantCard(v))}
        </div>
      </div>
    );
  };

  // Flatten unique product groups across all categories (by name)
  const flatProductGroups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; variants: any[]; first: any; categories: Set<string> }
    >();
    for (const { category, items } of groupedByCategory) {
      for (const it of items) {
        const key = (it.name ?? "").trim().toLowerCase();
        const entry: {
          name: string;
          variants: any[];
          first: any;
          categories: Set<string>;
        } = map.get(key) ?? {
          name: it.name,
          variants: [] as any[],
          first: it.variants[0],
          categories: new Set<string>(),
        };
        // merge variants (dedupe by id)
        const existingIds = new Set(entry.variants.map((v: any) => v.id));
        for (const v of it.variants) if (!existingIds.has(v.id)) entry.variants.push(v);
        entry.categories.add(category);
        if (!map.has(key)) map.set(key, entry);
      }
    }
    return Array.from(map.values());
  }, [groupedByCategory]);

  const formSchema = z.object({
    firstname: z.string().min(1, "First name is required"),
    lastname: z.string().min(1, "Last name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z
      .string()
      .min(11, "Phone must be 11 digits")
      .max(11, "Phone must be 11 digits"),
    subject: z.string().optional(),
    message: z.string().min(1, "Message is required"),
  });
  type FormData = z.infer<typeof formSchema>;

  // Form state and methods
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const createOrder = api.orders.create.useMutation();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const firstname = data.firstname?.trim();
      const lastname = data.lastname?.trim();
      const phone = data.phone?.trim();
      const message = data.message?.trim();
      if (!firstname || !lastname || !message || !phone || phone.length !== 11) {
        console.warn("orders.create blocked: invalid form payload", {
          firstname,
          lastname,
          phone,
          message,
        });
        return;
      }
      await createOrder.mutateAsync({
        firstname,
        lastname,
        email: data.email?.trim() || undefined,
        phone,
        subject: data.subject?.trim() || undefined,
        message,
      });
      setSubmitSuccess(true);
      reset();
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-orange-50 bg-cover bg-fixed bg-no-repeat"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 border-b border-[#f8610e]/10 bg-white/80 backdrop-blur-sm"
      >
        <div className="px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <motion.div className="flex items-center space-x-4" whileHover={{ scale: 1.02 }}>
              <div className="h-[70px] w-[70px] overflow-hidden rounded-full">
                <Image alt="logo" src="/logo.png" width={500} height={500} className="h-full w-full" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Pings Ping Tinapa</h1>
                <p className="text-sm text-gray-600">Authentic Filipino Delicacy</p>
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
              {/* <a
                href="#pasalubong"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("pasalubong");
                }}
                className="font-medium text-gray-700 transition-colors hover:text-[#f8610e]"
              >
                Pasalubong
              </a> */}
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
            {/* Slide 1: Hero */}
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
                    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-8">
                      <div className="space-y-4">
                        <motion.h2
                          className="text-5xl leading-tight font-bold text-gray-900 lg:text-7xl"
                          variants={fadeInUp}
                        >
                          Premium
                          <span className="block text-[#f8610e]">Tinapa</span>
                        </motion.h2>
                        <motion.p className="max-w-lg text-xl leading-relaxed text-gray-600" variants={fadeInUp}>
                          Experience the authentic taste of traditional Filipino
                          smoked fish, crafted with time-honored techniques and
                          the finest ingredients.
                        </motion.p>
                      </div>
                      <motion.div variants={fadeInUp} className="flex flex-col gap-4 sm:flex-row">
                        <Button className="rounded-full bg-[#f8610e] px-8 py-4 text-lg font-semibold text-white hover:bg-[#f8610e]/90">
                          Shop Now
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-full border-[#f8610e] bg-transparent px-8 py-4 text-lg font-semibold text-[#f8610e] hover:bg-[#f8610e] hover:text-white"
                        >
                          Learn More
                        </Button>
                      </motion.div>
                      <motion.div variants={fadeInUp} className="grid grid-cols-3 gap-8 pt-8">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-[#f8610e]">25+</div>
                          <div className="text-sm font-medium text-gray-600">Years Experience</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-[#f8610e]">1000+</div>
                          <div className="text-sm font-medium text-gray-600">Happy Customers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-[#f8610e]">100%</div>
                          <div className="text-sm font-medium text-gray-600">Natural</div>
                        </div>
                      </motion.div>
                    </motion.div>
                    <motion.div variants={fadeInUp} className="relative">
                      <div className="relative h-[500px] overflow-hidden rounded-3xl bg-white shadow-2xl lg:h-[500px]">
                        <Image className="rounded-3xl bg-[#6d2803] p-5" src="/aboutUS5.png" alt="Premium Tinapa" fill unoptimized />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Slide 2: About */}
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
                    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-8">
                      <div className="space-y-6">
                        <motion.h2 className="text-4xl font-bold text-gray-900 lg:text-5xl" variants={fadeInUp}>
                          About <span className="text-[#f8610e]">Pings Ping Tinapa</span>
                        </motion.h2>
                        <motion.p className="text-lg leading-relaxed text-gray-600" variants={fadeInUp}>
                          For over 25 years, Pings Ping Tinapa has been crafting authentic Filipino smoked fish using
                          traditional methods passed down through generations. Our commitment to quality and authenticity
                          has made us a beloved name in Filipino cuisine.
                        </motion.p>
                        <motion.p className="text-lg leading-relaxed text-gray-600" variants={fadeInUp}>
                          We source only the freshest fish from local fishermen and use time-honored smoking techniques
                          to create the perfect balance of flavor and aroma. Every piece of tinapa is carefully prepared
                          with love and dedication to preserve the authentic taste of this Filipino delicacy.
                        </motion.p>
                      </div>
                      <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-8">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <Award className="h-6 w-6 text-[#f8610e]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Premium Quality</h4>
                            <p className="text-sm text-gray-600">Hand-selected ingredients</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <Users className="h-6 w-6 text-[#f8610e]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Family Business</h4>
                            <p className="text-sm text-gray-600">Three generations strong</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <Clock className="h-6 w-6 text-[#f8610e]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Traditional Methods</h4>
                            <p className="text-sm text-gray-600">Time-tested processes</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <Star className="h-6 w-6 text-[#f8610e]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Authentic Taste</h4>
                            <p className="text-sm text-gray-600">Original Filipino flavors</p>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                    <motion.div variants={fadeInUp} className="relative">
                      <div className="relative h-[600px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#f8610e]/5 to-[#f8610e]/20 shadow-2xl">
                        <Image src="/aboutUs.png" alt="About Pings Ping Tinapa" fill unoptimized className="object-cover" />
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

            {/* Slide 3: Heritage */}
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
                    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-8">
                      <div className="space-y-6">
                        <motion.h2 className="text-4xl font-bold text-gray-900 lg:text-5xl" variants={fadeInUp}>
                          Our <span className="text-[#f8610e]">Heritage</span>
                        </motion.h2>
                        <motion.p className="text-lg leading-relaxed text-gray-600" variants={fadeInUp}>
                          From humble beginnings in a small coastal town, our familys passion for creating the perfect tinapa has
                          been passed down through three generations. Each recipe tells a story of dedication, tradition, and love
                          for Filipino culinary heritage.
                        </motion.p>
                        <motion.p className="text-lg leading-relaxed text-gray-600" variants={fadeInUp}>
                          Today, we continue to honor our ancestors legacy while embracing modern techniques to bring you the finest
                          smoked fish products. Every bite connects you to our rich cultural heritage and the timeless flavors of the
                          Philippines.
                        </motion.p>
                      </div>
                      <motion.div variants={fadeInUp} className="space-y-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <span className="text-lg font-bold text-[#f8610e]">1</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Traditional Smoking Process</h4>
                            <p className="text-sm text-gray-600">Using coconut husks and native wood for authentic flavor</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <span className="text-lg font-bold text-[#f8610e]">2</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Fresh Local Catch</h4>
                            <p className="text-sm text-gray-600">Sourced daily from trusted local fishermen</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8610e]/10">
                            <span className="text-lg font-bold text-[#f8610e]">3</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Family Recipe</h4>
                            <p className="text-sm text-gray-600">Secret blend of spices perfected over generations</p>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                    <motion.div variants={fadeInUp} className="relative">
                      <div className="relative h-[600px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#f8610e]/5 to-[#f8610e]/20 shadow-2xl">
                        <Image src="/aboutUs4.png" alt="Our Heritage - Pings Ping Tinapa" fill unoptimized className="object-cover" />
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
                  currentSlide === index ? "scale-125 bg-[#f8610e]" : "bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Unified Products Showcase (Tinapa + Pasalubong) */}
      <section id="products" className="mx-auto max-w-7xl px-6 py-16">
        <h3 className="mb-12 text-center text-4xl font-bold text-gray-900">Our Products</h3>
        {loadingAll ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[420px] animate-pulse rounded-2xl bg-white p-4 shadow-lg">
                <div className="h-64 w-full rounded-xl bg-gray-200" />
                <div className="mt-4 h-5 w-2/3 rounded bg-gray-200" />
                <div className="mt-3 h-4 w-full rounded bg-gray-100" />
                <div className="mt-2 h-4 w-5/6 rounded bg-gray-100" />
                <div className="mt-4 h-6 w-24 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {/* Category filter buttons */}
            <div className="flex flex-wrap gap-2">
              {categoryList.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className={`${selectedCategory === cat ? "bg-[#f8610e] hover:bg-[#f8610e]/90 text-white" : "text-[#6d2803]"} rounded-full px-4 py-2 text-base font-semibold tracking-wide`}
                  onClick={() => {
                    if (cat === 'All') {
                      setSelectedCategory('All');
                      return;
                    }
                    if (showAll) {
                      // Keep full view and scroll to the category section
                      setSelectedCategory('All');
                      setTimeout(() => {
                        const el = document.getElementById(catToId(cat));
                        if (el) {
                          window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
                        }
                      }, 0);
                    } else {
                      setSelectedCategory(cat);
                    }
                  }}
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Content */}
            {selectedCategory === "All" ? (
              <>
                {showAll ? renderAllFull() : renderAllPreview()}
                <div className="mt-6 flex justify-center">
                  {!showAll ? (
                    <Button
                      className="rounded-full bg-[#f8610e] px-6 py-2 text-white hover:bg-[#f8610e]/90"
                      onClick={() => setShowAll(true)}
                    >
                      View All
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="rounded-full px-6 py-2"
                      onClick={() => {
                        setShowAll(false);
                        const el = document.getElementById('products');
                        if (el) {
                          window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
                        }
                      }}
                    >
                      Show Less
                    </Button>
                  )}
                </div>
              </>
            ) : (
              renderCategory(selectedCategory)
            )}
          </div>
        )}
      </section>

      {/* Product Details Dialog */}
      <Dialog open={isProductOpen} onOpenChange={setIsProductOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="break-words">
                {selectedProduct?.name}
              </DialogTitle>
              {selectedProduct?.variants && selectedProduct?.baseName && selectedProduct.name !== selectedProduct.baseName && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Back to product"
                  className="shrink-0"
                  onClick={() => {
                    const v = (selectedProduct!.variants as any[]) || [];
                    const groupDesc = (v.find((x: any) => (x?.description ?? "").trim().length > 0)?.description) ?? (v[0]?.description ?? "");
                    setSelectedProduct({
                      id: v[0]?.id,
                      name: selectedProduct!.baseName!,
                      description: groupDesc,
                      image: v[0]?.image,
                      price: undefined,
                      variants: v,
                      baseName: selectedProduct!.baseName,
                    });
                    setShowVariantList(true);
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
            </div>
            {selectedProduct?.price !== undefined ? (
              <DialogDescription className="break-words">
                {formatPHP(Number(selectedProduct?.price ?? 0))}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          {/* Scrollable body to prevent overflow */}
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="relative h-64 w-full overflow-hidden rounded-xl shrink-0">
              {selectedProduct?.image ? (
                <Image
                  src={selectedProduct.image}
                  alt={selectedProduct.name ?? "product"}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-100 text-gray-500">
                  No image
                </div>
              )}
            </div>

            <p className="text-sm text-gray-700 whitespace-pre-line break-words">
              {selectedProduct?.description || "No description provided."}
            </p>

            {/* Price summary for group view */}
            {isGroupView && Array.isArray(selectedProduct?.variants) && (selectedProduct?.variants?.length ?? 0) > 0 && (
              <div className="rounded-lg border p-3">
                <div className="mb-1 text-sm font-medium text-gray-700">Price</div>
                {(() => {
                  const prices = (selectedProduct?.variants ?? [])
                    .map((v: any) => parseFloat(v.price))
                    .filter((n: number) => !Number.isNaN(n));
                  const min = Math.min(...prices);
                  const max = Math.max(...prices);
                  return (
                    <div className="text-lg font-semibold text-[#f8610e]">
                      {prices.length === 0
                        ? formatPHP(0)
                        : prices.length > 1 && min !== max
                        ? `${formatPHP(min)} - ${formatPHP(max)}`
                        : formatPHP(prices[0] ?? 0)}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Variant selector (compact) */}
            {Array.isArray(selectedProduct?.variants) && (selectedProduct?.variants?.length ?? 0) > 1 && (
              <div className="mt-2">
                <div className="mb-1 text-sm font-medium text-gray-700">Variants</div>
                <div className="grid grid-cols-2 gap-2">
                  {(selectedProduct?.variants ?? [])
                    .slice()
                    .sort((a: any, b: any) => (a.size || "").localeCompare(b.size || ""))
                    .map((v: any) => {
                      const sizeLabel = v?.size ? String(v.size).charAt(0) + String(v.size).slice(1).toLowerCase() : "";
                      const active = Number(selectedProduct?.id) === Number(v.id);
                      return (
                        <button
                          key={v.id}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-orange-50 ${active ? 'bg-orange-50 border-orange-300' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const base = selectedProduct?.baseName ?? selectedProduct?.name ?? "";
                            setSelectedProduct({
                              id: v.id,
                              name: sizeLabel ? `${base} - ${sizeLabel}` : base,
                              description: v.description ?? "",
                              image: v.image,
                              price: v.price,
                              variants: selectedProduct?.variants,
                              baseName: base,
                            });
                          }}
                        >
                          {sizeLabel ? (
                            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">{sizeLabel}</span>
                          ) : (
                            <span />
                          )}
                          <span className="font-medium">{formatPHP(parseFloat(v.price))}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Rating summary for current selection */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium text-gray-700">Rating</div>
              {isGroupView ? (
                <StarRow average={groupDialogStats.avg} count={groupDialogStats.count} />
              ) : (
                <StarRow average={ratingsMap?.[Number(selectedProduct?.id)]?.average ?? 0} count={ratingsMap?.[Number(selectedProduct?.id)]?.count ?? 0} />
              )}
            </div>


            {/* Submit a rating (no account required) */}
            <div className="rounded-lg border p-4 md:p-5">
              <div className="mb-3 text-base md:text-lg font-semibold text-gray-800">Leave a rating</div>
              <div className="mb-3 flex items-center gap-3">
                {Array.from({ length: 5 }).map((_, i) => {
                  const idx = i + 1;
                  const active = ratingValue >= idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="p-2"
                      onClick={() => setRatingValue(idx)}
                      aria-label={`Rate ${idx} star${idx > 1 ? 's' : ''}`}
                    >
                      <Star className={active ? "h-7 w-7 md:h-8 md:w-8 text-yellow-500 fill-yellow-500" : "h-7 w-7 md:h-8 md:w-8 text-gray-300"} />
                    </button>
                  );
                })}
                {ratingValue > 0 && (
                  <span className="text-base text-gray-700">{ratingValue}/5</span>
                )}
              </div>
              <textarea
                className="w-full rounded-md border p-3 text-base min-h-[120px]"
                placeholder="Optional comment"
                rows={5}
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  disabled={rateMutation.isPending || ratingValue < 1 || !selectedProduct || !ratingTargetId}
                  onClick={async () => {
                    if (!selectedProduct || ratingValue < 1 || !ratingTargetId) return;
                    await rateMutation.mutateAsync({
                      productId: ratingTargetId,
                      rating: ratingValue,
                      comment: ratingComment || undefined,
                    });
                    setRatingValue(0);
                    setRatingComment("");
                  }}
                  className="bg-[#f8610e] hover:bg-[#e2550a] h-10 md:h-11 px-5 md:px-6 text-sm md:text-base"
                >
                  {rateMutation.isPending ? "Submitting…" : "Submit Rating"}
                </Button>
              </div>
            </div>
          </div>
            {false && Array.isArray(selectedProduct?.variants) && (selectedProduct?.variants?.length ?? 0) > 0 && (
              <div className="mt-2">
                <div className="mb-2 text-sm md:text-base font-medium text-gray-700">Variants</div>
                <div className="grid gap-6 md:grid-cols-2">
                  {(selectedProduct?.variants ?? [])
                    .slice()
                    .sort((a: any, b: any) => (a.size || "").localeCompare(b.size || ""))
                    .map((v: any) => {
                      const base = selectedProduct?.baseName ?? selectedProduct?.name ?? "";
                      const isActive = Number(selectedProduct?.id) === Number(v.id);
                      const sizeLabel = v?.size ? String(v.size).charAt(0) + String(v.size).slice(1).toLowerCase() : "";
                      const priceText = formatPHP(parseFloat(v.price));
                      const rating = ratingsMap?.[Number(v.id)];
                      return (
                        <Card
                          key={v.id}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedProduct({
                              id: v.id,
                              name: `${base} - ${sizeLabel}`,
                              description: v.description ?? "",
                              image: v.image,
                              price: v.price,
                              variants: selectedProduct?.variants,
                              baseName: base,
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setSelectedProduct({
                                id: v.id,
                                name: `${base} - ${sizeLabel}`,
                                description: v.description ?? "",
                                image: v.image,
                                price: v.price,
                                variants: selectedProduct?.variants,
                                baseName: base,
                              });
                            }
                          }}
                          className={`group overflow-hidden rounded-2xl border shadow-md transition hover:shadow-lg focus:outline-none ${
                            isActive ? "ring-2 ring-[#f8610e]/50" : ""
                          }`}
                        >
                          <div className="relative h-48 md:h-56 w-full">
                            <Image src={v.image || "/placeholder.svg"} alt={`${base} - ${sizeLabel}`} fill unoptimized className="object-cover" />
                          </div>
                          <CardContent className="p-5">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="rounded bg-orange-100 px-2.5 py-0.5 text-xs md:text-sm text-orange-700">{sizeLabel}</span>
                              <span className="text-lg md:text-xl font-semibold text-[#f8610e]">{priceText}</span>
                            </div>
                            <StarRow average={rating?.average ?? 0} count={rating?.count ?? 0} />
                            {v?.description && (
                              <p className="mt-3 text-sm md:text-base text-gray-600">
                                {v.description}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}
        </DialogContent>
      </Dialog>

      {/* Contact / Message Section */}
      <section className="bg-gray-50 py-20" id="contact">
        <div className="mx-auto max-w-7xl px-6" id="inquire">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2 className="mb-4 text-4xl font-bold text-gray-900 lg:text-5xl" variants={fadeInUp}>
              Get In <span className="text-[#f8610e]">Touch</span>
            </motion.h2>
            <motion.p className="mx-auto mb-16 max-w-2xl text-lg text-gray-600" variants={fadeInUp}>
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
                        Calbayog City Samar purok 4 Rono st.
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
                         6:00 PM - 10:00 PM
                        <br />
                        Sunday: 9:00 AM - 4:00 PM
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Contact Form */}
            <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={fadeInUp}>
              <Card className="overflow-hidden rounded-2xl shadow-lg">
                <CardContent className="p-8">
                  <h3 className="mb-6 text-2xl font-bold text-gray-900">
                    Send us a Message
                  </h3>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {submitSuccess && (
                      <div className="rounded-md bg-green-50 p-4">
                        <div className="flex">
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-green-800">
                              Message sent successfully!
                            </h3>
                            <div className="mt-2 text-sm text-green-700">
                              <p>
                                Thank you for contacting us Well get back to you
                                soon.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="firstname" className="mb-2 block text-sm font-medium text-gray-700">
                          First Name
                        </label>
                        <input
                          id="firstname"
                          {...register("firstname")}
                          className={`w-full rounded-lg border px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none ${
                            errors.firstname ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="John"
                        />
                        {errors.firstname && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.firstname.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="lastname" className="mb-2 block text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        <input
                          id="lastname"
                          {...register("lastname")}
                          className={`w-full rounded-lg border px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none ${
                            errors.lastname ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Doe"
                        />
                        {errors.lastname && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.lastname.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        {...register("email")}
                        className={`w-full rounded-lg border px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none ${
                          errors.email ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="john.doe@example.com"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        {...register("phone")}
                        className={`w-full rounded-lg border px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none ${
                          errors.phone ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="09171234567"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="subject" className="mb-2 block text-sm font-medium text-gray-700">
                        Subject
                      </label>
                      <input
                        id="subject"
                        {...register("subject")}
                        className={`w-full rounded-lg border px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none ${
                          errors.subject ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Product Inquiry"
                      />
                      {errors.subject && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.subject.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="message" className="mb-2 block text-sm font-medium text-gray-700">
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        {...register("message")}
                        className={`w-full rounded-lg border px-4 py-3 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20 focus:outline-none ${
                          errors.message ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Tell us about your inquiry or order requirements..."
                      ></textarea>
                      {errors.message && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.message.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-full bg-[#f8610e] py-3 text-lg font-semibold text-white hover:bg-[#f8610e]/90 disabled:opacity-70"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
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
              <SocialButtons
                facebookUrl="https://www.facebook.com/share/1GHDtjUBvy/"
                instagramUrl="https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.instagram.com%2Fpingpingstinapa%3Figsh%3DMXVweDRxNGplb3Qxcg%253D%253D%26fbclid%3DIwZXh0bgNhZW0CMTAAYnJpZBExYW1nT0x5NFRxcXBscWVZVwEegxJE_g2zbZb-3CkDaSNT5W2ULsFKszbqrRzCKJchvHCT-vOKpqXd43rTbS4_aem_GdIcNrxkJETEziWjChSVgg&h=AT26Zzp67mUpEC8VuMCxDsIjg-JNX7xhpYywtbpbLo_jYJkdO8XTmcP4_-qL8XhScMIj48CCz81RMlY_cVXVUWSTanijgJbszon3ZYXtSlkC5KpSf_rO8XIpHmOdgLvQfBiIPHWLVTZhBJUzf5S_MQ"
              />
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
                  {/* <a href="#products" className="hover:text-[#f8610e]">
                    Products
                  </a>
                </li>
                <li> */}
                  {/* <a href="#pasalubong" className="hover:text-[#f8610e]">
                    Pasalubong
                  </a>
                </li>
                <li> */}
                  <a href="#contact" className="hover:text-[#f8610e]">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Contact Info</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Calbayog City, Philippines</li>
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











