import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  RefreshCw,
  Filter,
  Calendar,
  MessageSquare,
  User,
  Facebook,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { facebookService } from "@/lib/facebookService";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface FacebookReview {
  id: string;
  facebook_review_id: string;
  reviewer_name: string;
  reviewer_id?: string;
  rating: number;
  review_text?: string;
  created_time: string;
  recommendation_type?: string;
  facebook_connections: {
    page_name: string;
    page_id: string;
  };
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
  lastSyncAt?: string;
}

export const FacebookReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<FacebookReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"created_time" | "rating">(
    "created_time"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterRating, setFilterRating] = useState<string>("all");
  const reviewsPerPage = 10;

  useEffect(() => {
    if (user) {
      loadReviews();
      loadStats();
    }
  }, [user, currentPage, sortBy, sortOrder, filterRating]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const filters = {
        rating: filterRating !== "all" ? parseInt(filterRating) : undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: reviewsPerPage,
      };
      const data = await facebookService.getUserReviews(filters);
      setReviews(data);
    } catch (error) {
      console.error("Error loading Facebook reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await facebookService.getReviewStats();
      setStats(statsData);
    } catch (error) {
      console.error("Error loading Facebook review stats:", error);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      await facebookService.syncReviews();
      await loadReviews();
      await loadStats();
    } catch (error) {
      console.error("Error syncing Facebook reviews:", error);
    } finally {
      setLoading(false);
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

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getRecommendationBadge = (type?: string) => {
    if (!type) return null;

    const config = {
      positive: { label: "Recommends", color: "bg-green-100 text-green-800" },
      negative: { label: "Not Recommended", color: "bg-red-100 text-red-800" },
    };

    const badge = config[type as keyof typeof config];
    if (!badge) return null;

    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading Facebook reviews...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Facebook className="w-6 h-6 text-blue-600" />
            Facebook Reviews
          </h2>
          <p className="text-gray-600 mt-1">
            Manage and analyze your Facebook page reviews
          </p>
        </div>
        <Button onClick={handleSync} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sync Reviews
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reviews</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.totalReviews}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-600" />
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
                <Star className="w-8 h-8 text-yellow-600" />
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
                <div className="flex">{renderStars(5)}</div>
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
                <div className="flex">{renderStars(1)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_time">Date Created</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortOrder}
                onValueChange={(value: any) => setSortOrder(value)}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest</SelectItem>
                  <SelectItem value="asc">Oldest</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Rating" />
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
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No reviews found
              </h3>
              <p className="text-gray-600 mb-4">
                Connect your Facebook page to import reviews.
              </p>
              <Button onClick={handleSync}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Reviews
              </Button>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback>
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    {/* Review Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {review.reviewer_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {renderStars(review.rating)}
                          </div>
                          <span
                            className={`font-semibold ${getRatingColor(
                              review.rating
                            )}`}
                          >
                            {review.rating}/5
                          </span>
                          {getRecommendationBadge(review.recommendation_type)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(review.created_time), {
                            addSuffix: true,
                          })}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          <Facebook className="w-3 h-3 mr-1" />
                          {review.facebook_connections.page_name}
                        </Badge>
                      </div>
                    </div>

                    {/* Review Content */}
                    {review.review_text && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-800 leading-relaxed">
                          {review.review_text}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {reviews.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(currentPage - 1) * reviewsPerPage + 1} to{" "}
            {Math.min(currentPage * reviewsPerPage, reviews.length)} of{" "}
            {reviews.length} reviews
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={reviews.length < reviewsPerPage}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
