import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IncidentForm from "../components/ranger/IncidentForm";

const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

const geoCallbacks: Record<string, PositionCallback> = {};

const mockGeolocation = {
  getCurrentPosition: vi.fn((success: PositionCallback, _error: PositionErrorCallback, _opts?: PositionOptions) => {
    geoCallbacks.success = success;
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "geolocation", {
    value: mockGeolocation,
    writable: true,
  });
});

describe("IncidentForm", () => {
  const defaultProps = {
    onSubmit: mockOnSubmit,
    isSubmitting: false,
    disabled: false,
  };

  it("renders all required fields", () => {
    render(<IncidentForm {...defaultProps} />);

    expect(screen.getByLabelText(/incident type/i)).toBeInTheDocument();
    expect(screen.getByText(/use current gps/i)).toBeInTheDocument();
    expect(screen.getByText(/enter manually/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/patrol id/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log incident/i })).toBeInTheDocument();
  });

  it("renders photo field as optional", () => {
    render(<IncidentForm {...defaultProps} />);

    expect(screen.getByText(/supporting photo/i)).toBeInTheDocument();
    expect(screen.getByText(/choose photo/i)).toBeInTheDocument();
  });

  it("shows validation error when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<IncidentForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /log incident/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/please select an incident type/i)).toBeInTheDocument();
    expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    expect(screen.getByText(/location coordinates are required/i)).toBeInTheDocument();
  });

  it("allows selecting an incident type", async () => {
    const user = userEvent.setup();
    render(<IncidentForm {...defaultProps} />);

    const select = screen.getByLabelText(/incident type/i);
    await user.selectOptions(select, "Snare");

    expect(select).toHaveValue("Snare");
  });

  it("shows manual location inputs in Manual mode", () => {
    render(<IncidentForm {...defaultProps} />);

    expect(screen.getByPlaceholderText(/latitude/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/longitude/i)).toBeInTheDocument();
  });

  it("accepts valid manual coordinates and submits", async () => {
    const user = userEvent.setup();
    render(<IncidentForm {...defaultProps} />);

    await user.selectOptions(screen.getByLabelText(/incident type/i), "Snare");
    await user.type(screen.getByPlaceholderText(/latitude/i), "-2.3456");
    await user.type(screen.getByPlaceholderText(/longitude/i), "34.5678");
    await user.type(screen.getByLabelText(/description/i), "Test snare found");
    await user.click(screen.getByRole("button", { name: /log incident/i }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const call = mockOnSubmit.mock.calls[0][0];
    expect(call.incidentType).toBe("Snare");
    expect(call.location.latitude).toBe(-2.3456);
    expect(call.location.longitude).toBe(34.5678);
    expect(call.location.source).toBe("Manual");
  }, 15000);

  it("shows error for invalid latitude", async () => {
    const user = userEvent.setup();
    render(<IncidentForm {...defaultProps} />);

    await user.selectOptions(screen.getByLabelText(/incident type/i), "Snare");
    await user.type(screen.getByPlaceholderText(/latitude/i), "999");
    await user.type(screen.getByPlaceholderText(/longitude/i), "34.5678");
    await user.type(screen.getByLabelText(/description/i), "Test");
    await user.click(screen.getByRole("button", { name: /log incident/i }));

    expect(screen.getByText(/invalid latitude/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  }, 15000);

  it("shows error for invalid longitude", async () => {
    const user = userEvent.setup();
    render(<IncidentForm {...defaultProps} />);

    await user.selectOptions(screen.getByLabelText(/incident type/i), "Snare");
    await user.type(screen.getByPlaceholderText(/latitude/i), "-2.3456");
    await user.type(screen.getByPlaceholderText(/longitude/i), "999");
    await user.type(screen.getByLabelText(/description/i), "Test");
    await user.click(screen.getByRole("button", { name: /log incident/i }));

    expect(screen.getByText(/invalid longitude/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  }, 15000);

  it("submits without photo (photo is optional)", async () => {
    const user = userEvent.setup();
    render(<IncidentForm {...defaultProps} />);

    await user.selectOptions(screen.getByLabelText(/incident type/i), "Snare");
    await user.type(screen.getByPlaceholderText(/latitude/i), "-2.3456");
    await user.type(screen.getByPlaceholderText(/longitude/i), "34.5678");
    await user.type(screen.getByLabelText(/description/i), "Test snare");
    await user.click(screen.getByRole("button", { name: /log incident/i }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const photoArg = mockOnSubmit.mock.calls[0][1];
    expect(photoArg).toBeNull();
  }, 15000);

  it("disables form when disabled prop is true", () => {
    render(<IncidentForm {...defaultProps} disabled={true} />);

    expect(screen.getByLabelText(/incident type/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByLabelText(/patrol id/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /log incident/i })).toBeDisabled();
  });

  it("shows Loading text when submitting", () => {
    render(<IncidentForm {...defaultProps} isSubmitting={true} />);

    expect(screen.getByRole("button", { name: /logging/i })).toBeInTheDocument();
  });

  it("clears validation error when user types in field", async () => {
    const user = userEvent.setup();
    render(<IncidentForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /log incident/i }));
    expect(screen.getByText(/description is required/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/description/i), "Some text");
    expect(screen.queryByText(/description is required/i)).not.toBeInTheDocument();
  });

  it("captures GPS location and shows coordinates", () => {
    render(<IncidentForm {...defaultProps} />);

    fireEvent.click(screen.getByText(/use current gps/i));

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();

    act(() => {
      geoCallbacks.success({
        coords: { latitude: 7.123456, longitude: 80.654321, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: Date.now(),
      });
    });

    expect(screen.getByText(/gps location captured/i)).toBeInTheDocument();
    expect(screen.getByText(/lat: 7.123456/i)).toBeInTheDocument();
    expect(screen.getByText(/lng: 80.654321/i)).toBeInTheDocument();
  });

  it("shows error when geolocation is not supported", () => {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      writable: true,
    });

    render(<IncidentForm {...defaultProps} />);

    act(() => {
      fireEvent.click(screen.getByText(/use current gps/i));
    });

    expect(screen.getByText(/geolocation is not supported/i)).toBeInTheDocument();
  });

  it("shows permission denied error from GPS", () => {
    const mockError = {
      code: 1,
      message: "User denied Geolocation",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGeolocation.getCurrentPosition.mockImplementation((_s: PositionCallback, e: PositionErrorCallback) => {
      act(() => {
        e(mockError as GeolocationPositionError);
      });
    });

    render(<IncidentForm {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByText(/use current gps/i));
    });

    expect(screen.getByText(/location access denied/i)).toBeInTheDocument();
  });

  it("shows position unavailable error from GPS", () => {
    const mockError = {
      code: 2,
      message: "Position unavailable",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGeolocation.getCurrentPosition.mockImplementation((_s: PositionCallback, e: PositionErrorCallback) => {
      act(() => {
        e(mockError as GeolocationPositionError);
      });
    });

    render(<IncidentForm {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByText(/use current gps/i));
    });

    expect(screen.getByText(/gps position unavailable/i)).toBeInTheDocument();
  });

  it("shows timeout error from GPS", () => {
    const mockError = {
      code: 3,
      message: "Timeout",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGeolocation.getCurrentPosition.mockImplementation((_s: PositionCallback, e: PositionErrorCallback) => {
      act(() => {
        e(mockError as GeolocationPositionError);
      });
    });

    render(<IncidentForm {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByText(/use current gps/i));
    });

    expect(screen.getByText(/gps request timed out/i)).toBeInTheDocument();
  });

  it("shows generic GPS error for unknown code", () => {
    const mockError = {
      code: 0,
      message: "Unknown error",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGeolocation.getCurrentPosition.mockImplementation((_s: PositionCallback, e: PositionErrorCallback) => {
      act(() => {
        e(mockError as GeolocationPositionError);
      });
    });

    render(<IncidentForm {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByText(/use current gps/i));
    });

    expect(screen.getByText(/unable to get location/i)).toBeInTheDocument();
  });

  it("rejects photo over 5MB", async () => {
    const user = userEvent.setup();
    render(<IncidentForm {...defaultProps} />);

    const bigFile = new File(["x".repeat(6 * 1024 * 1024)], "big.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [bigFile],
      writable: false,
    });

    fireEvent.change(input);

    expect(screen.getByText(/photo must be under 5mb/i)).toBeInTheDocument();
  });

  it("adds and removes a photo", async () => {
    render(<IncidentForm {...defaultProps} />);

    const smallFile = new File(["hello"], "photo.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [smallFile],
      writable: false,
    });

    fireEvent.change(input);

    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    expect(screen.getByText(/remove/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/remove/i));

    expect(screen.queryByText("photo.jpg")).not.toBeInTheDocument();
    expect(screen.getByText(/choose photo/i)).toBeInTheDocument();
  });

  it("shows error for missing patrol ID", async () => {
    const user = userEvent.setup();
    render(<IncidentForm {...defaultProps} />);

    await user.selectOptions(screen.getByLabelText(/incident type/i), "Snare");
    await user.type(screen.getByPlaceholderText(/latitude/i), "6.5");
    await user.type(screen.getByPlaceholderText(/longitude/i), "80.0");
    await user.type(screen.getByLabelText(/description/i), "Test");

    const patrolInput = screen.getByLabelText(/patrol id/i);
    await user.clear(patrolInput);

    await user.click(screen.getByRole("button", { name: /log incident/i }));

    expect(screen.getByText(/patrol id is required/i)).toBeInTheDocument();
  }, 15000);
});
