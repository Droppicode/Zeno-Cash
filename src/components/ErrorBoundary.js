import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleRestart = () => {
    // Normally you'd want to restart the JS bundle or navigate to a safe screen
    // For now, we just clear the error state and try to re-render
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={80} color="#FF5252" />
          <Text style={styles.title}>Ops, algo deu errado!</Text>
          <Text style={styles.subtitle}>O aplicativo encontrou um erro inesperado e não conseguiu renderizar a tela atual.</Text>
          
          {this.state.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText} numberOfLines={4}>
                {this.state.error.toString()}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#BBBBBB',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24
  },
  errorBox: {
    backgroundColor: '#2A0000',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
    width: '100%'
  },
  errorText: {
    color: '#FF8888',
    fontFamily: 'monospace',
    fontSize: 12
  },
  button: {
    backgroundColor: '#BB86FC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default ErrorBoundary;
