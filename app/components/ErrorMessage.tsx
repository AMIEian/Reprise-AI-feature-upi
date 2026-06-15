import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ErrorMessageProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
}

export default function ErrorMessage({ message, type = 'error' }: ErrorMessageProps) {
  const colors = {
    error: '#dc2626',
    warning: '#eab308',
    info: '#2563eb',
  };

  const bgColors = {
    error: '#fee2e2',
    warning: '#fef3c7',
    info: '#dbeafe',
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColors[type] }]}>
      <Text style={[styles.text, { color: colors[type] }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
