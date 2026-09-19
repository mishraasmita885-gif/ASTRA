
import json


class P3AnomalyDetector:

    def __init__(
        self,
        config_path="p3_detector_config.json"
    ):

        with open(config_path, "r") as f:
            config = json.load(f)

        self.channel = config["channel"]
        self.threshold = config["threshold"]
        self.max_gap = config["max_gap"]
        self.buffer = config["event_buffer"]
        self.merge_gap = config["merge_gap"]

        self.previous_value = None
        self.raw_anomalies = []

    # --------------------------------------------------------
    # Process one telemetry value
    # --------------------------------------------------------

    def process(self, value, timestamp):

        value = float(value)

        if self.previous_value is None:

            self.previous_value = value

            return {
                "anomaly": False,
                "score": 0.0,
                "timestamp": timestamp
            }

        change = abs(
            value - self.previous_value
        )

        self.previous_value = value

        is_anomaly = (
            change > self.threshold
        )

        if is_anomaly:
            self.raw_anomalies.append(
                timestamp
            )

        return {
            "anomaly": bool(is_anomaly),
            "score": float(change),
            "timestamp": timestamp
        }

    # --------------------------------------------------------
    # Build final anomaly events
    # --------------------------------------------------------

    def build_events(self):

        if not self.raw_anomalies:
            return []

        points = sorted(
            set(self.raw_anomalies)
        )

        # Group nearby detections
        events = []

        start = points[0]
        previous = points[0]

        for current in points[1:]:

            if current - previous <= self.max_gap:
                previous = current

            else:

                events.append(
                    (start, previous)
                )

                start = current
                previous = current

        events.append(
            (start, previous)
        )

        # Add buffer
        buffered = []

        for start, end in events:

            buffered.append(
                (
                    max(
                        0,
                        start - self.buffer
                    ),
                    end + self.buffer
                )
            )

        # Merge nearby events
        merged = []

        current_start, current_end = buffered[0]

        for start, end in buffered[1:]:

            if (
                start - current_end
                <= self.merge_gap
            ):

                current_end = max(
                    current_end,
                    end
                )

            else:

                merged.append(
                    (
                        current_start,
                        current_end
                    )
                )

                current_start = start
                current_end = end

        merged.append(
            (
                current_start,
                current_end
            )
        )

        return merged
