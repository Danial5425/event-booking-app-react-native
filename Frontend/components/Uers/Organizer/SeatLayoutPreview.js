import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SEAT_BASE_SIZE = SCREEN_WIDTH * 0.06; // 6% of screen width
const SPACING = SCREEN_WIDTH * 0.01; // 1% of screen width

const SeatLayoutPreview = ({ rows, seatArrangement, seatType }) => {
  const { theme } = useTheme();
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH * 0.9);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Calculate scale based on number of seats in a row
    if (rows && rows[0]) {
      const seatsInRow = rows[0].seats.length;
      const totalWidth = seatsInRow * (SEAT_BASE_SIZE + SPACING * 2);
      const availableWidth = SCREEN_WIDTH * 0.8; // 80% of screen width
      const newScale = totalWidth > availableWidth ? availableWidth / totalWidth : 1;
      setScale(newScale);
      setContainerWidth(totalWidth * newScale + 50); // Add padding for row labels
    }
  }, [rows]);

  const getSeatColor = (type) => {
    switch (type) {
      case 'premium':
        return '#FFD700';
      case 'vip':
        return '#FF4500';
      default:
        return '#4F46E5';
    }
  };

  const renderTheaterLayout = () => {
    return (
      <ScrollView horizontal={true} style={styles.container}>
        <ScrollView>
          <View style={[styles.screen, { width: containerWidth }]}>
            <Text style={styles.screenText}>SCREEN</Text>
          </View>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <View style={[styles.seats, { transform: [{ scale }] }]}>
                {row.seats.map((seat, seatIndex) => (
                  <TouchableOpacity 
                    key={seatIndex} 
                    style={[
                      styles.seat,
                      { 
                        backgroundColor: getSeatColor(seatType),
                        width: SEAT_BASE_SIZE,
                        height: SEAT_BASE_SIZE,
                        margin: SPACING
                      }
                    ]}
                  >
                    <Text style={styles.seatText}>{seat.number}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    );
  };

  const renderClassroomLayout = () => {
    return (
      <ScrollView horizontal={true} style={styles.container}>
        <ScrollView>
          <View style={[styles.teacherArea, { width: containerWidth }]}>
            <Text style={styles.screenText}>STAGE</Text>
          </View>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.classroomRow}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <View style={[styles.classroomSeats, { transform: [{ scale }] }]}>
                {row.seats.map((seat, seatIndex) => (
                  <TouchableOpacity 
                    key={seatIndex} 
                    style={[
                      styles.classroomSeat,
                      { 
                        backgroundColor: getSeatColor(seatType),
                        width: SEAT_BASE_SIZE * 1.2,
                        height: SEAT_BASE_SIZE * 1.2,
                        margin: SPACING * 2
                      }
                    ]}
                  >
                    <Text style={styles.seatText}>{seat.number}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    );
  };

  const renderRoundTableLayout = () => {
    const tablesPerRow = Math.ceil(rows[0]?.seats.length / 6) || 1;
    const tableSize = SEAT_BASE_SIZE * 4;
    
    return (
      <ScrollView horizontal={true} style={styles.container}>
        <ScrollView>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.roundTableRow}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <View style={[styles.tables, { transform: [{ scale }] }]}>
                {Array.from({ length: tablesPerRow }).map((_, tableIndex) => (
                  <View key={tableIndex} style={[styles.tableContainer, { width: tableSize * 1.5 }]}>
                    <View style={[styles.roundTable, { width: tableSize, height: tableSize }]}>
                      <Text style={styles.tableNumber}>{tableIndex + 1}</Text>
                    </View>
                    <View style={[styles.tableSeats, { width: tableSize * 2, height: tableSize * 2 }]}>
                      {Array.from({ length: 6 }).map((_, seatIndex) => {
                        const actualSeatIndex = tableIndex * 6 + seatIndex;
                        if (actualSeatIndex < row.seats.length) {
                          const angle = seatIndex * 60;
                          const radius = tableSize * 0.8;
                          return (
                            <TouchableOpacity 
                              key={seatIndex} 
                              style={[
                                styles.roundTableSeat,
                                { 
                                  backgroundColor: getSeatColor(seatType),
                                  width: SEAT_BASE_SIZE * 1.2,
                                  height: SEAT_BASE_SIZE * 1.2,
                                  transform: [
                                    { translateX: radius * Math.cos(angle * Math.PI / 180) },
                                    { translateY: radius * Math.sin(angle * Math.PI / 180) }
                                  ]
                                }
                              ]}
                            >
                              <Text style={styles.seatText}>
                                {row.seats[actualSeatIndex].number}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                        return null;
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    );
  };

  const renderLayout = () => {
    switch (seatArrangement) {
      case 'classroom':
        return renderClassroomLayout();
      case 'roundtable':
        return renderRoundTableLayout();
      default:
        return renderTheaterLayout();
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Seat Layout</Text>
      </View>
      {renderLayout()}
      <View style={[styles.legend, { borderTopColor: theme.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: theme.success }]} />
          <Text style={[styles.legendText, { color: theme.text }]}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: theme.primary }]} />
          <Text style={[styles.legendText, { color: theme.text }]}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: theme.error }]} />
          <Text style={[styles.legendText, { color: theme.text }]}>Booked</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    marginVertical: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  container: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  screen: {
    backgroundColor: '#333',
    padding: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  screenText: {
    color: 'white',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',   
    alignItems: 'center',
    marginBottom: SPACING * 2,
  },
  rowLabel: {
    width: 30,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: SCREEN_WIDTH * 0.03,
  },
  seats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  seat: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  seatText: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.025,
  },
  classroomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING * 4,
  },
  classroomSeats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  teacherArea: {
    backgroundColor: '#666',
    padding: 15,
    marginBottom: 30,
    alignItems: 'center',
  },
  roundTableRow: {
    marginBottom: SPACING * 6,
  },
  tables: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingLeft: 30,
  },
  tableContainer: {
    margin: SPACING * 4,
    alignItems: 'center',
  },
  roundTable: {
    borderRadius: 100,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: SCREEN_WIDTH * 0.03,
  },
  tableSeats: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundTableSeat: {
    position: 'absolute',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
  },
});

export default SeatLayoutPreview;