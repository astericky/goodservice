class StopTime < ActiveRecord::Base
  belongs_to :trip, foreign_key: "trip_internal_id", primary_key: "internal_id"
  belongs_to :stop, foreign_key: "stop_internal_id", primary_key: "internal_id"

  DAY_IN_MINUTES = 86400

  def self.soon(time_range: 60.minutes)
    if (rounded_time + time_range).to_date == Date.current.tomorrow
      where("(departure_time > ? and departure_time < ?) or (departure_time > ? and departure_time < ?)",
        rounded_time - rounded_time.beginning_of_day,
        rounded_time - rounded_time.beginning_of_day + time_range.to_i,
        0,
        (rounded_time - rounded_time.beginning_of_day + time_range.to_i) % DAY_IN_MINUTES
      ).includes(:trip).joins(trip: :schedule).merge(Schedule.today)
    elsif rounded_time.hour < 4
      where("(departure_time > ? and departure_time < ?) or (departure_time > ? and departure_time < ?)",
        rounded_time - rounded_time.beginning_of_day,
        rounded_time - rounded_time.beginning_of_day + time_range.to_i,
        rounded_time - rounded_time.beginning_of_day + DAY_IN_MINUTES,
        rounded_time - rounded_time.beginning_of_day + DAY_IN_MINUTES + time_range.to_i
      ).includes(:trip).joins(trip: :schedule).merge(Schedule.today)
    else
      where("departure_time > ? and departure_time < ?",
        rounded_time - rounded_time.beginning_of_day,
        rounded_time - rounded_time.beginning_of_day + time_range.to_i
      ).includes(:trip).joins(trip: :schedule).merge(Schedule.today)
    end
  end

  def self.recent(time_range: 30.minutes)
    if rounded_time.hour < 4
      where("(departure_time > ? and departure_time < ?) or (departure_time > ? and departure_time < ?)",
        rounded_time - rounded_time.beginning_of_day - time_range.to_i,
        rounded_time - rounded_time.beginning_of_day,
        rounded_time - rounded_time.beginning_of_day + DAY_IN_MINUTES - time_range.to_i,
        rounded_time - rounded_time.beginning_of_day + DAY_IN_MINUTES,
      ).includes(:trip).joins(trip: :schedule).merge(Schedule.today)
    else
      where("departure_time > ? and departure_time < ?",
        rounded_time - rounded_time.beginning_of_day - time_range.to_i,
        rounded_time - rounded_time.beginning_of_day
      ).includes(:trip).joins(trip: :schedule).merge(Schedule.today)
    end
  end

  def self.rounded_time
    Time.current.change(sec: 0)
  end

  def self.soon_by_route(route_id, direction, time_range: 60.minutes)
    Rails.cache.fetch("stop-times-#{route_id}-#{direction}-#{time_range}-#{rounded_time}", expires_in: 5.minutes) do
      soon(time_range: time_range).where(trips: {route_internal_id: route_id, direction: direction})
    end
  end

  def self.scheduled_destinations_by_route(route_id, direction)
    Rails.cache.fetch("scheduled-destinations-#{route_id}-#{direction}-#{rounded_time}", expires_in: 5.minutes) do
      StopTime.soon_by_route(route_id, direction).map(&:trip).map(&:destination).sort.uniq
    end
  end
end