import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Star,
  ExternalLink,
  User,
  RefreshCw,
  Plus,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { yelpService } from "@/lib/yelpService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface YelpReview {
  id: string;
  yelp_review_id: string;
  reviewer_name: string;
  reviewer_image_url?: string;
  rating: number;
  text: string;
  created_time: string;
  review_url: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

export const YelpReviews: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<YelpReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [businessUrl, setBusinessUrl] = useState("");
  const [connection, setConnection] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"created_time" | "rating">(
    "created_time"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 10;

  useEffect(() => {
    if (user) {
      loadConnection();
      loadReviews();
      loadStats();
    }
  }, [user, sortBy, sortOrder, filterRating, currentPage]);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      console.log("Current session:", session);
      console.log("User ID:", session?.user?.id);
      console.log("Auth error:", error);
    };
    checkAuth();
  }, []);

  const loadConnection = async () => {
    if (!user) return;

    try {
      const conn = await yelpService.getConnection(user.id);
      setConnection(conn);
    } catch (error) {
      console.error("Error loading Yelp connection:", error);
    }
  };

  const loadReviews = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const minRating =
        filterRating === "all" ? undefined : parseInt(filterRating);
      const maxRating =
        filterRating === "all" ? undefined : parseInt(filterRating);

      const reviewsData = await yelpService.getUserReviews(user.id, {
        limit: reviewsPerPage,
        offset: (currentPage - 1) * reviewsPerPage,
        sortBy,
        sortOrder,
        minRating,
        maxRating,
      });

      setReviews(reviewsData);
    } catch (error) {
      console.error("Error loading reviews:", error);
      setError("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const statsData = await yelpService.getReviewStats(user.id);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleConnect = async () => {
    if (!user || !businessUrl.trim()) return;

    setConnecting(true);
    setError(null);

    try {
      const business = await yelpService.getBusinessByUrl(businessUrl.trim());
      await yelpService.saveConnection(user.id, business);

      // Fetch and save initial reviews
      const reviews = await yelpService.getBusinessReviews(business.id);
      await yelpService.saveReviews(user.id, business.id, reviews);

      setConnection({
        business_id: business.id,
        business_name: business.name,
        business_url: business.url,
      });
      setBusinessUrl("");

      // Reload data
      await loadReviews();
      await loadStats();
    } catch (error) {
      console.error("Error connecting to Yelp:", error);
      setError(
        error instanceof Error ? error.message : "Failed to connect to Yelp"
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      const result = await yelpService.syncReviews(user.id);

      if (result.success) {
        await loadReviews();
        await loadStats();
      } else {
        setError(result.error || "Failed to sync reviews");
      }
    } catch (error) {
      console.error("Error syncing reviews:", error);
      setError("Failed to sync reviews");
    } finally {
      setSyncing(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!connection) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-red-600" />
              Connect Your Yelp Business
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Enter your Yelp business profile URL to start importing reviews.
            </p>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yelp Business Profile URL
                </label>
                <Input
                  type="url"
                  placeholder="https://www.yelp.com/biz/your-business-name-city"
                  value={businessUrl}
                  onChange={(e) => setBusinessUrl(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: https://www.yelp.com/biz/restaurant-name-new-york
                </p>
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting || !businessUrl.trim()}
                className="w-full"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Connect Yelp Business
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-red-600" />
            Yelp Reviews
          </h2>
          <p className="text-gray-600 mt-1">
            Reviews from {connection.business_name}
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync Reviews
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reviews</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.totalReviews}
                  </p>
                </div>
                <Star className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.averageRating}★
                  </p>
                </div>
                <div className="flex">
                  {renderStars(Math.round(stats.averageRating))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">5-Star Reviews</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.ratingDistribution[5] || 0}
                  </p>
                </div>
                <div className="flex text-yellow-400">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">1-Star Reviews</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.ratingDistribution[1] || 0}
                  </p>
                </div>
                <Star className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort by
              </label>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split("-");
                  setSortBy(field as "created_time" | "rating");
                  setSortOrder(order as "asc" | "desc");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_time-desc">
                    Newest First
                  </SelectItem>
                  <SelectItem value="created_time-asc">Oldest First</SelectItem>
                  <SelectItem value="rating-desc">Highest Rating</SelectItem>
                  <SelectItem value="rating-asc">Lowest Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Rating
              </label>
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Reviews Found
            </h3>
            <p className="text-gray-600">
              {filterRating !== "all"
                ? `No reviews found with ${filterRating} star${
                    filterRating !== "1" ? "s" : ""
                  }.`
                : "No reviews available. Try syncing to fetch the latest reviews."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {review.reviewer_image_url ? (
                      <img
                        src={review.reviewer_image_url}
                        alt={review.reviewer_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {review.reviewer_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatDate(review.created_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(review.rating)}</div>
                    <Badge variant="outline">{review.rating}/5</Badge>
                  </div>
                </div>

                {review.text && (
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {review.text}
                  </p>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Review ID: {review.yelp_review_id}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(review.review_url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View on Yelp
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {reviews.length === reviewsPerPage && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
