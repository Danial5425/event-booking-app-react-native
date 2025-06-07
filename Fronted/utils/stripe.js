import { initStripe, useStripe, StripeProvider } from '@stripe/stripe-react-native';
import { Platform } from 'react-native';
import config from '../config';

export const initializeStripe = async () => {
  try {
    const options = {
      publishableKey: config.STRIPE_PUBLISHABLE_KEY,
      merchantIdentifier: 'merchant.com.yourapp',
      urlScheme: 'yourapp',
      setReturnUrlSchemeOnAndroid: Platform.OS === 'android',
      enableKeepAlive: true,
    };

    await initStripe(options);
    console.log('Stripe initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    throw error;
  }
};

export const initPaymentSheet = async (stripe, clientSecret) => {
  const { error } = await stripe.initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: "Your Event App",
    paymentMethodTypes: ['card'],
    style: 'automatic',
    allowsDelayedPaymentMethods: true,
    defaultBillingDetails: {
      name: 'Event Booking',
    },
    appearance: {
      colors: {
        primary: '#4F46E5',
      },
    },
  });

  if (error) {
    console.error('Payment sheet init error:', error);
    throw error;
  }
};

export const presentPaymentSheet = async (stripe) => {
  try {
    const { error, paymentOption } = await stripe.presentPaymentSheet();

    if (error) {
      console.error('Payment sheet error:', error);
      throw error;
    }

    return { success: true, paymentOption };
  } catch (error) {
    console.error('Payment presentation error:', error);
    throw error;
  }
};

export const StripeWrapper = ({ children }) => {
  return (
    <StripeProvider
      publishableKey={config.STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.yourapp"
      urlScheme="yourapp"
      setReturnUrlSchemeOnAndroid={Platform.OS === 'android'}
      enableKeepAlive={true}
      threeDSecureParams={{
        timeout: 5,
        backgroundColor: '#FFFFFF',
        label: {
          textColor: '#000000',
        },
        navigationBar: {
          headerText: 'Complete your payment',
          buttonText: 'Cancel',
          textColor: '#000000',
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      {children}
    </StripeProvider>
  );
}; 