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
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { googleBusinessService } from "@/lib/googleBusinessService";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Review {
  id: string;
  google_review_name: string;
  reviewer_display_name: string;
  reviewer_profile_photo_url?: string;
  star_rating: number;
  comment?: string;
  create_time: string;
  update_time: string;
  review_reply_comment?: string;
  review_reply_update_time?: string;
  google_business_locations: {
    location_display_name: string;
  };
}

export const GoogleBusinessReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"create_time" | "star_rating">(
    "create_time"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [syncProgress, setSyncProgress] = useState<string>("");
  const reviewsPerPage = 10;

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [user, currentPage, sortBy, sortOrder, filterRating]);

  const loadReviews = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const offset = (currentPage - 1) * reviewsPerPage;
      const reviewsData = await googleBusinessService.getUserReviews(user.id, {
        limit: reviewsPerPage,
        offset,
        sortBy,
        sortOrder,
      });

      // Filter by rating if specified
      let filteredReviews = reviewsData;
      if (filterRating !== "all") {
        filteredReviews = reviewsData.filter(
          (review) => review.star_rating === parseInt(filterRating)
        );
      }

      setReviews(filteredReviews);
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const statsData = await googleBusinessService.getReviewStats(user.id);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleSync = async () => {
    if (!user) return;

    // Show warning about rate limits
    const proceed = window.confirm(
      "⚠️ Initial sync may take 2-5 minutes due to Google's strict rate limits.\n\n" +
        "The sync will process slowly to avoid hitting API limits. Please keep this tab open.\n\n" +
        "Continue?"
    );

    if (!proceed) return;

    try {
      setLoading(true);
      setSyncProgress("Starting sync...");

      const result = await googleBusinessService.syncReviews(user.id);

      if (result.success) {
        await loadReviews();
        await loadStats();
        setSyncProgress("");
        alert(
          `✅ Sync Complete!\n\n` +
            `• Reviews synced: ${result.reviewsCount}\n` +
            `• Locations: ${result.locationsCount}\n\n` +
            `Future syncs will be faster.`
        );
      } else {
        setSyncProgress("");
        alert(
          `❌ Sync Failed\n\n${result.error}\n\n` +
            `This usually happens due to Google's rate limits. ` +
            `Please wait 2-3 minutes and try again.`
        );
      }
    } catch (error) {
      console.error("Error syncing reviews:", error);
      setSyncProgress("");
      alert(
        `❌ Sync Error\n\n` +
          `${error instanceof Error ? error.message : "Unknown error"}\n\n` +
          `If you see "429 Too Many Requests", wait 2-3 minutes before retrying.`
      );
    } finally {
      setLoading(false);
    }
  };
  // const handleSync = async () => {
  //   if (!user) return;

  //   try {
  //     setLoading(true);
  //     const result = await googleBusinessService.syncReviews(user.id);

  //     if (result.success) {
  //       await loadReviews();
  //       await loadStats();
  //       alert(`Successfully synced ${result.reviewsCount} reviews!`);
  //     } else {
  //       alert(`Sync failed: ${result.error}`);
  //     }
  //   } catch (error) {
  //     console.error('Error syncing reviews:', error);
  //     alert('Failed to sync reviews');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Google My Business Reviews
          </h2>
          <p className="text-gray-600 mt-1">
            Manage and analyze your Google Business Profile reviews
          </p>
        </div>
        <Button onClick={handleSync} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {syncProgress || "Syncing..."}
            </>
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
                    {stats.ratingDistribution[5]}
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
                    {stats.ratingDistribution[1]}
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
                  <SelectItem value="create_time">Date Created</SelectItem>
                  <SelectItem value="star_rating">Rating</SelectItem>
                  <SelectItem value="update_time">Last Updated</SelectItem>
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
                Sync your Google My Business account to import reviews.
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
                    <AvatarImage src={review.reviewer_profile_photo_url} />
                    <AvatarFallback>
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    {/* Review Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {review.reviewer_display_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {renderStars(review.star_rating)}
                          </div>
                          <span
                            className={`font-semibold ${getRatingColor(
                              review.star_rating
                            )}`}
                          >
                            {review.star_rating}/5
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(review.create_time), {
                            addSuffix: true,
                          })}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {
                            review.google_business_locations
                              .location_display_name
                          }
                        </Badge>
                      </div>
                    </div>

                    {/* Review Content */}
                    {review.comment && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-800 leading-relaxed">
                          {review.comment}
                        </p>
                      </div>
                    )}

                    {/* Business Reply */}
                    {review.review_reply_comment && (
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            Business Reply
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(
                              new Date(review.review_reply_update_time!),
                              { addSuffix: true }
                            )}
                          </span>
                        </div>
                        <p className="text-gray-800">
                          {review.review_reply_comment}
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
